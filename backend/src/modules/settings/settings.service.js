import fs from 'fs/promises';
import path from 'path';
import { ENV } from '../../config/env.js';
import { withTransaction } from '../../db/transaction.js';
import { logger } from '../../utils/logger.js';

// Users created by database/init/02_seed.sql — the only rows that survive a data wipe.
const SEED_USER_IDS = [
  'a0000000-0000-4000-8000-000000000001', // admin@stockflow.local
  'a0000000-0000-4000-8000-000000000002', // staff@stockflow.local
];

/**
 * Dev-only wipe of all transactional data: stock, stock ledger, orders (+items via
 * cascade), products (+gallery rows via cascade), media (+usage rows via cascade,
 * plus the files on disk) and every non-seed user (their sessions cascade).
 * Warehouse settings and the catalog tree (divisions/categories/sub-categories) are kept.
 */
export async function deleteAllData() {
  const { deleted, mediaPaths } = await withTransaction(async (execute) => {
    const mediaRows = await execute(`SELECT storage_path AS storagePath FROM media`);

    // Child tables first: stock/stock_ledger RESTRICT products; orders RESTRICT users;
    // media RESTRICT users. order_items, product_gallery_images, media_usage and
    // refresh_tokens all cascade from their parents.
    const deleted = {
      stock: (await execute(`DELETE FROM stock`)).affectedRows,
      stockLedger: (await execute(`DELETE FROM stock_ledger`)).affectedRows,
      orders: (await execute(`DELETE FROM orders`)).affectedRows,
      products: (await execute(`DELETE FROM products`)).affectedRows,
      media: (await execute(`DELETE FROM media`)).affectedRows,
      users: (
        await execute(
          `DELETE FROM users WHERE id NOT IN (${SEED_USER_IDS.map(() => '?').join(',')})`,
          SEED_USER_IDS,
        )
      ).affectedRows,
    };

    return { deleted, mediaPaths: mediaRows.map((row) => row.storagePath) };
  });

  // Files are removed only after the transaction commits — a rollback must not lose files.
  for (const storagePath of mediaPaths) {
    await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, storagePath)).catch((err) => {
      logger.error(`Failed to delete media file ${storagePath}: ${err.message}`);
    });
  }

  return deleted;
}
