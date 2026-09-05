#!/usr/bin/env node
/**
 * One-time bulk stock import for large legacy CSV exports (tens of thousands of rows).
 *
 * Why this exists instead of the "Import" button on the Stock page:
 *   1. That endpoint parses the upload with ExcelJS, which took 200–280 seconds per
 *      ~50,000-row file in testing — before a single database row is written. This
 *      script uses a purpose-built CSV parser (scripts/lib/fast-csv.js) that does the
 *      same job in well under a second.
 *   2. That endpoint inserts one row per HTTP request's transaction, sequentially,
 *      one INSERT statement per row. For 50,000+ rows that's tens of thousands of
 *      sequential round trips on one connection. This script batches inserts into
 *      multi-row statements (500 rows per statement, chunked into short transactions).
 *   3. It's "all or nothing": a single bad row (or a typo'd category) rejects the
 *      entire file. Real legacy exports have both — this script defaults to skipping
 *      and reporting bad rows instead of blocking the other 99% of a 50,000-row file.
 *      Pass --strict to restore the interactive endpoint's abort-on-any-error behavior.
 *   4. It's idempotent by batch key (product + invoice + size + price + discountPercent):
 *      re-running the script (after a crash, or just to pick up files you haven't run yet)
 *      skips rows whose exact batch already exists in `stock` instead of erroring, so it's
 *      safe to re-run over files that partially or fully succeeded.
 *
 * Usage (from backend/):
 *   node --env-file=.env scripts/import-stock-csv.js <file.csv> [file2.csv ...]
 *   node --env-file=.env scripts/import-stock-csv.js --dry-run stock-full-data-1.csv
 *   npm run import:stock -- stock-full-data-1.csv stock-full-data-2.csv
 *
 * Flags:
 *   --dry-run       Validate and resolve everything, write no data, print what would happen.
 *   --strict        Abort the whole file on any invalid/unmatched row (old behavior).
 *                   Default: skip bad rows, import the rest, report rejects.
 *   --chunk-size=N  Rows per INSERT/transaction (default 500).
 *
 * Column format (same as the interactive import): Product, ProductSubGroup, Price,
 * InvoiceNo, DiscountPercent, Quantity, InvoiceDate, Size, Note (Itemcode is ignored).
 * Products/categories must already exist — this does not auto-create them.
 */
import crypto from 'crypto';
import path from 'path';
import { pool } from '../src/db/pool.js';
import { executeQuery } from '../src/db/query.js';
import { withTransaction } from '../src/db/transaction.js';
import { pairKey, parseStockRow } from '../src/modules/stock/stock.parsing.js';
import { parseCsvFile } from './lib/fast-csv.js';

const DEFAULT_CHUNK_SIZE = 500;
const BATCH_CHECK_CHUNK = 1000;
const PAIR_MATCH_CHUNK = 300;

/** Natural batch identity — matches the grouping used to collapse per-unit stock into
 * batches when barcodes were dropped in favour of quantity-based intake. Two rows with the same key
 * represent the same intake batch. price/discountPercent are normalized to a fixed
 * 2-decimal string since mysql2 returns DECIMAL columns as strings (e.g. "899.00") while
 * freshly parsed file rows carry plain numbers (899). */
function batchKey(row) {
  return [row.productId, row.invoiceNo, row.size ?? '', Number(row.price).toFixed(2), Number(row.discountPercent).toFixed(2)].join(' ');
}

function parseArgs(argv) {
  const files = [];
  let dryRun = false;
  let strict = false;
  let chunkSize = DEFAULT_CHUNK_SIZE;

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--strict') strict = true;
    else if (arg.startsWith('--chunk-size=')) chunkSize = parseInt(arg.split('=')[1], 10) || DEFAULT_CHUNK_SIZE;
    else if (arg.startsWith('--')) throw new Error(`Unknown flag: ${arg}`);
    else files.push(arg);
  }
  if (files.length === 0) throw new Error('Usage: import-stock-csv.js [--dry-run] [--strict] <file.csv> [file2.csv ...]');
  return { files, dryRun, strict, chunkSize };
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function formatElapsed(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Parses+validates every row; returns { validRows, rejects } — never throws for bad data. */
function validateRows(rawRows, strict) {
  const validRows = [];
  const rejects = [];
  const warnings = [];

  for (const { rowNumber, data } of rawRows) {
    const parsed = parseStockRow(rowNumber, data);
    if (parsed.error) {
      rejects.push({ rowNumber, reason: parsed.error });
      if (strict) break;
      continue;
    }
    if (parsed.warning) warnings.push(parsed.warning);
    validRows.push(parsed.row);
  }

  if (strict && rejects.length > 0) {
    throw new Error(`--strict: row ${rejects[0].rowNumber} rejected — ${rejects[0].reason}`);
  }
  return { validRows, rejects, warnings };
}

/** Resolves every distinct (product, subGroup) pair to a product_id, chunked to stay well under any query-size limit. */
async function resolveProductIds(validRows, strict) {
  const uniquePairs = [
    ...new Map(validRows.map((r) => [pairKey(r.product, r.subGroup), { product: r.product, subGroup: r.subGroup }])).values(),
  ];

  const productLookup = new Map();
  const ambiguousKeys = new Set();
  for (const pairsChunk of chunk(uniquePairs, PAIR_MATCH_CHUNK)) {
    const matchConditions = pairsChunk.map(() => '(LOWER(p.name) = ? AND LOWER(c.name) = ?)').join(' OR ');
    const matchParams = pairsChunk.flatMap((pair) => [pair.product.toLowerCase(), pair.subGroup.toLowerCase()]);
    const matches = await executeQuery(
      `SELECT p.id AS productId, p.name, c.name AS categoryName
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE ${matchConditions}`,
      matchParams,
    );
    for (const match of matches) {
      const key = pairKey(match.name, match.categoryName);
      if (productLookup.has(key)) ambiguousKeys.add(key);
      else productLookup.set(key, match.productId);
    }
  }

  const resolvedRows = [];
  const rejects = [];
  for (const row of validRows) {
    const key = pairKey(row.product, row.subGroup);
    if (ambiguousKeys.has(key)) {
      rejects.push({ rowNumber: row.rowNumber, reason: `"${row.product}" / "${row.subGroup}" matches more than one product` });
      continue;
    }
    const productId = productLookup.get(key);
    if (!productId) {
      rejects.push({ rowNumber: row.rowNumber, reason: `no product named "${row.product}" found in category "${row.subGroup}"` });
      continue;
    }
    resolvedRows.push({ ...row, productId });
  }

  if (strict && rejects.length > 0) {
    throw new Error(`--strict: row ${rejects[0].rowNumber} rejected — ${rejects[0].reason}`);
  }
  return { resolvedRows, rejects };
}

/** Splits rows into { importable, alreadyInStock } based on batch keys already present in
 * `stock` (product + invoice + size + price + discountPercent) — this is what makes re-running the script safe. */
async function filterAlreadyInStock(resolvedRows) {
  const invoiceNumbers = [...new Set(resolvedRows.map((r) => r.invoiceNo))];
  const existing = new Set();
  for (const invoicesChunk of chunk(invoiceNumbers, BATCH_CHECK_CHUNK)) {
    const rows = await executeQuery(
      `SELECT product_id AS productId, invoice_no AS invoiceNo, size, price, discount_percent AS discountPercent
       FROM stock WHERE invoice_no IN (${invoicesChunk.map(() => '?').join(',')})`,
      invoicesChunk,
    );
    for (const row of rows) existing.add(batchKey(row));
  }

  const importable = [];
  const alreadyInStock = [];
  for (const row of resolvedRows) {
    (existing.has(batchKey(row)) ? alreadyInStock : importable).push(row);
  }
  return { importable, alreadyInStock };
}

/**
 * Inserts `rows` in chunks of `chunkSize`, each its own transaction that also bumps
 * products.quantity_available and writes one stock_ledger row per product touched in
 * that chunk. Chunk-level (not whole-file) transactions mean a crash partway through
 * leaves already-committed chunks intact — nothing to roll back or redo by hand;
 * re-running the script picks up exactly where it left off via the batch check above.
 */
async function insertRows(rows, chunkSize, fileLabel, onProgress) {
  const chunks = chunk(rows, chunkSize);
  for (let c = 0; c < chunks.length; c += 1) {
    const rowsChunk = chunks[c];
    await withTransaction(async (execute) => {
      await execute(
        `INSERT INTO stock (id, product_id, quantity, price, discount_percent, size, invoice_no, invoice_date, note)
         VALUES ${rowsChunk.map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?)`).join(', ')}`,
        rowsChunk.flatMap((row) => [
          crypto.randomUUID(), row.productId, row.quantity, row.price, row.discountPercent, row.size, row.invoiceNo, row.invoiceDate, row.note,
        ]),
      );

      const countsByProduct = new Map();
      for (const row of rowsChunk) countsByProduct.set(row.productId, (countsByProduct.get(row.productId) ?? 0) + row.quantity);

      const firstRow = rowsChunk[0].rowNumber;
      const lastRow = rowsChunk[rowsChunk.length - 1].rowNumber;
      const note = `Bulk CSV import — ${fileLabel} (rows ${firstRow}-${lastRow})`.slice(0, 500);
      for (const [productId, count] of countsByProduct) {
        await execute(`UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?`, [count, productId]);
        await execute(
          `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
           VALUES (?, 'in', ?, 'import', NULL, ?)`,
          [productId, count, note],
        );
      }
    });
    onProgress(c + 1, chunks.length, (c + 1) * chunkSize);
  }
}

function printRejectsSample(label, rejects, limit = 10) {
  if (rejects.length === 0) return;
  console.log(`  ${label} (${rejects.length}), first ${Math.min(limit, rejects.length)}:`);
  for (const r of rejects.slice(0, limit)) {
    console.log(`    row ${r.rowNumber}: ${r.reason}`);
  }
}

async function processFile(filePath, { dryRun, strict, chunkSize }) {
  const fileLabel = path.basename(filePath);
  const fileStart = Date.now();
  console.log(`\n=== ${fileLabel} ===`);

  const rawRows = parseCsvFile(filePath);
  console.log(`  parsed ${rawRows.length} data rows`);

  const { validRows, rejects: validationRejects, warnings } = validateRows(rawRows, strict);
  const { resolvedRows, rejects: matchRejects } = await resolveProductIds(validRows, strict);
  const { importable, alreadyInStock } = await filterAlreadyInStock(resolvedRows);

  const allRejects = [...validationRejects, ...matchRejects];

  console.log(`  valid: ${validRows.length}  matched-to-product: ${resolvedRows.length}  rejected: ${allRejects.length}`);
  console.log(`  already in stock (will skip): ${alreadyInStock.length}  new (will import): ${importable.length}`);
  if (warnings.length > 0) console.log(`  ${warnings.length} warning(s), e.g.: ${warnings[0]}`);
  printRejectsSample('validation rejects', validationRejects);
  printRejectsSample('unmatched product/category rejects', matchRejects);

  if (dryRun) {
    console.log(`  [dry-run] no data written`);
    return { fileLabel, imported: 0, skipped: alreadyInStock.length, rejected: allRejects.length, rejects: allRejects };
  }

  if (importable.length > 0) {
    let lastLoggedPercent = -1;
    await insertRows(importable, chunkSize, fileLabel, (chunksDone, totalChunks, rowsDone) => {
      const percent = Math.floor((chunksDone / totalChunks) * 100);
      if (percent !== lastLoggedPercent && (percent % 10 === 0 || chunksDone === totalChunks)) {
        lastLoggedPercent = percent;
        const elapsed = formatElapsed(Date.now() - fileStart);
        console.log(`  ...${percent}% (chunk ${chunksDone}/${totalChunks}, ~${Math.min(rowsDone, importable.length)} rows, ${elapsed} elapsed)`);
      }
    });
  }

  console.log(`  done in ${formatElapsed(Date.now() - fileStart)} — imported ${importable.length}, skipped ${alreadyInStock.length}, rejected ${allRejects.length}`);
  return { fileLabel, imported: importable.length, skipped: alreadyInStock.length, rejected: allRejects.length, rejects: allRejects };
}

async function main() {
  const { files, dryRun, strict, chunkSize } = parseArgs(process.argv.slice(2));
  console.log(`Bulk stock import — ${files.length} file(s)${dryRun ? ' (DRY RUN)' : ''}${strict ? ' (strict)' : ''}, chunk size ${chunkSize}`);

  const results = [];
  for (const file of files) {
    results.push(await processFile(file, { dryRun, strict, chunkSize }));
  }

  const totals = results.reduce(
    (acc, r) => ({ imported: acc.imported + r.imported, skipped: acc.skipped + r.skipped, rejected: acc.rejected + r.rejected }),
    { imported: 0, skipped: 0, rejected: 0 },
  );
  console.log(`\n=== Summary ===`);
  for (const r of results) console.log(`  ${r.fileLabel}: imported ${r.imported}, skipped ${r.skipped}, rejected ${r.rejected}`);
  console.log(`  TOTAL: imported ${totals.imported}, skipped ${totals.skipped}, rejected ${totals.rejected}`);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nImport failed:', err.message);
    await pool.end();
    process.exit(1);
  });
