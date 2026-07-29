import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { parseRowsFromFile } from '../../utils/importFile.js';
import { pairKey, parseStockRow } from './stock.parsing.js';

const STOCK_COLUMNS = `
  s.id, s.quantity, s.mrp, s.wsp, s.size, s.invoice_no AS invoiceNo, s.invoice_date AS invoiceDate,
  s.note, s.created_at AS createdAt, s.updated_at AS updatedAt,
  s.product_id AS productId, p.name AS productName, p.product_code AS productCode, c.name AS categoryName
`;
const STOCK_JOINS = `FROM stock s JOIN products p ON p.id = s.product_id JOIN categories c ON c.id = p.category_id`;

// stock.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  quantity: 's.quantity',
  invoice_no: 's.invoice_no',
  invoice_date: 's.invoice_date',
  mrp: 's.mrp',
  wsp: 's.wsp',
  created_at: 's.created_at',
};

export async function listStock(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(s.invoice_no LIKE ? OR p.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (filters.productId) {
    conditions.push('s.product_id = ?');
    params.push(filters.productId);
  }
  if (filters.invoiceNo) {
    conditions.push('s.invoice_no = ?');
    params.push(filters.invoiceNo);
  }
  if (filters.dateFrom) {
    conditions.push('s.invoice_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('s.invoice_date <= ?');
    params.push(filters.dateTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;
  // Search filters on p.name, so the id lookup only needs the products join when searching.
  const idJoins = search ? `FROM stock s JOIN products p ON p.id = s.product_id` : `FROM stock s`;

  // Sort/paginate on `stock` alone first (uses its indexes directly), then join the full
  // product/category columns onto just that page's rows. Sorting through the 3-table join up
  // front makes MySQL pick products/categories as the driving table and filesort the entire
  // matching set — disastrous once stock has 100k+ rows.
  const [idRows, countRows] = await Promise.all([
    executeQuery(
      `SELECT s.id ${idJoins} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total ${idJoins} ${where}`, params),
  ]);

  if (idRows.length === 0) return { rows: [], total: countRows[0].total };

  const ids = idRows.map((r) => r.id);
  const rows = await executeQuery(
    `SELECT ${STOCK_COLUMNS} ${STOCK_JOINS} WHERE s.id IN (${ids.map(() => '?').join(',')}) ORDER BY ${orderColumn} ${order}`,
    ids,
  );

  return { rows, total: countRows[0].total };
}

export async function getStockById(id) {
  const [row] = await executeQuery(`SELECT ${STOCK_COLUMNS} ${STOCK_JOINS} WHERE s.id = ?`, [id]);
  if (!row) throw new AppError(404, 'Stock item not found');
  return row;
}

export async function deleteStock(id) {
  const existing = await getStockById(id);

  await withTransaction(async (execute) => {
    const [product] = await execute(
      `SELECT id, name, quantity_available AS quantityAvailable FROM products WHERE id = ? FOR UPDATE`,
      [existing.productId],
    );
    if (product.quantityAvailable < existing.quantity) {
      throw new AppError(
        409,
        `Cannot delete this batch — only ${product.quantityAvailable} of ${existing.quantity} units are still available (the rest are reserved or dispatched)`,
      );
    }

    await execute(`DELETE FROM stock WHERE id = ?`, [id]);
    await execute(`UPDATE products SET quantity_available = quantity_available - ? WHERE id = ?`, [
      existing.quantity,
      existing.productId,
    ]);
    await execute(
      `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
       VALUES (?, 'out', ?, 'adjustment', NULL, ?)`,
      [existing.productId, existing.quantity, `Stock batch deleted — invoice ${existing.invoiceNo}`],
    );
  });
}

/**
 * Creates one stock intake batch against a product/invoice, bumps
 * products.quantity_available, and writes one stock_ledger 'in'/'import' row — all in
 * one transaction.
 */
export async function createStockBatch({ productId, invoiceNo, invoiceDate, mrp, wsp, size, note, quantity }) {
  const [product] = await executeQuery(
    `SELECT id, name, is_active AS isActive FROM products WHERE id = ?`,
    [productId],
  );
  if (!product) throw new AppError(404, 'Product not found');
  if (!product.isActive) throw new AppError(409, 'Product is inactive — activate it before adding stock');

  await withTransaction(async (execute) => {
    await execute(
      `INSERT INTO stock (id, product_id, quantity, mrp, wsp, size, invoice_no, invoice_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), productId, quantity, mrp, wsp, size ?? null, invoiceNo, invoiceDate ?? null, note ?? null],
    );
    await execute(`UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?`, [quantity, productId]);
    await execute(
      `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
       VALUES (?, 'in', ?, 'import', NULL, ?)`,
      [productId, quantity, `Stock intake — invoice ${invoiceNo}`.slice(0, 500)],
    );
  });

  return { imported: quantity, productId, productName: product.name, invoiceNo };
}

/**
 * Bulk-imports stock rows from an uploaded .xlsx/.csv (columns: Product, ProductSubGroup, Mrp,
 * InvoiceNo, WSalePrice, Quantity, InvoiceDate, Size, Note — Itemcode is ignored). All-or-nothing:
 * if any row is invalid, unmatched, or the invoice was already imported, nothing is inserted.
 */
export async function importStock(buffer, originalName) {
  const rawRows = await parseRowsFromFile(buffer, originalName);

  const errors = [];
  const warnings = [];
  const parsedRows = [];

  for (const { rowNumber, data } of rawRows) {
    const parsed = parseStockRow(rowNumber, data);
    if (parsed.error) {
      errors.push(parsed.error);
      continue;
    }
    if (parsed.warning) warnings.push(parsed.warning);
    parsedRows.push(parsed.row);
  }

  if (errors.length > 0) {
    throw new AppError(400, `Import rejected — fix these rows and re-upload: ${errors.join('; ')}`);
  }
  if (parsedRows.length === 0) {
    throw new AppError(400, 'File has no valid data rows');
  }

  // Duplicate-invoice guard against existing data — checked before anything is matched/inserted
  // so a re-uploaded file fails cleanly instead of the operator double-counting stock.
  const invoiceNumbers = [...new Set(parsedRows.map((r) => r.invoiceNo))];

  const existingInvoices = await executeQuery(
    `SELECT DISTINCT invoice_no AS invoiceNo FROM stock WHERE invoice_no IN (${invoiceNumbers.map(() => '?').join(',')})`,
    invoiceNumbers,
  );
  if (existingInvoices.length > 0) {
    throw new AppError(
      409,
      `This file has already been imported — invoice number(s) already on record: ${existingInvoices.map((r) => r.invoiceNo).join(', ')}`,
    );
  }

  // Resolve every distinct (Product, ProductSubGroup) pair to a product_id in one batch query.
  const uniquePairs = [...new Map(parsedRows.map((r) => [pairKey(r.product, r.subGroup), { product: r.product, subGroup: r.subGroup }])).values()];
  const matchConditions = uniquePairs.map(() => '(LOWER(p.name) = ? AND LOWER(c.name) = ?)').join(' OR ');
  const matchParams = uniquePairs.flatMap((pair) => [pair.product.toLowerCase(), pair.subGroup.toLowerCase()]);

  const matches = await executeQuery(
    `SELECT p.id AS productId, p.name, c.name AS categoryName
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE ${matchConditions}`,
    matchParams,
  );

  const productLookup = new Map();
  const ambiguousKeys = new Set();
  for (const match of matches) {
    const key = pairKey(match.name, match.categoryName);
    if (productLookup.has(key)) ambiguousKeys.add(key);
    else productLookup.set(key, match.productId);
  }

  const unmatched = [];
  for (const row of parsedRows) {
    const key = pairKey(row.product, row.subGroup);
    if (ambiguousKeys.has(key)) {
      unmatched.push(`Row ${row.rowNumber}: "${row.product}" / "${row.subGroup}" matches more than one product`);
    } else if (!productLookup.has(key)) {
      unmatched.push(`Row ${row.rowNumber}: no product named "${row.product}" found in category "${row.subGroup}"`);
    }
  }
  if (unmatched.length > 0) {
    throw new AppError(400, `Import rejected — these rows could not be matched to a product: ${unmatched.join('; ')}`);
  }

  // Everything validated — insert one batch row per file row and bump product counters in one transaction.
  const productCounts = new Map();
  await withTransaction(async (execute) => {
    for (const row of parsedRows) {
      const productId = productLookup.get(pairKey(row.product, row.subGroup));
      await execute(
        `INSERT INTO stock (id, product_id, quantity, mrp, wsp, size, invoice_no, invoice_date, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), productId, row.quantity, row.mrp, row.wsp, row.size, row.invoiceNo, row.invoiceDate, row.note],
      );
      productCounts.set(productId, (productCounts.get(productId) ?? 0) + row.quantity);
    }
    const ledgerNote = `File import — invoice ${invoiceNumbers.join(', ')}`.slice(0, 500);
    for (const [productId, count] of productCounts) {
      await execute(`UPDATE products SET quantity_available = quantity_available + ? WHERE id = ?`, [count, productId]);
      await execute(
        `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
         VALUES (?, 'in', ?, 'import', NULL, ?)`,
        [productId, count, ledgerNote],
      );
    }
  });

  const productIds = [...productCounts.keys()];
  const products = await executeQuery(
    `SELECT id AS productId, name FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
    productIds,
  );

  return {
    imported: parsedRows.length,
    invoiceNumbers,
    byProduct: products.map((p) => ({ productId: p.productId, name: p.name, count: productCounts.get(p.productId) })),
    warnings,
  };
}
