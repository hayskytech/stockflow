import fs from 'fs/promises';
import path from 'path';
import { ENV } from '../../config/env.js';
import { withTransaction } from '../../db/transaction.js';
import { logger } from '../../utils/logger.js';

// Users created by database/init/02_seed.sql — the only rows that survive a data wipe.
const SEED_USER_IDS = [
  'a0000000-0000-4000-8000-000000000001', // admin@example.com
  'a0000000-0000-4000-8000-000000000002', // staff@example.com
  'a0000000-0000-4000-8000-000000000003', // customer@example.com
];

/**
 * Dev-only wipe of all transactional data: stock, stock ledger, dispatches, orders
 * (+items via cascade), products (+gallery rows via cascade), the catalog tree
 * (sub-categories, categories, divisions), media (+usage rows via cascade, plus the
 * files on disk) and every non-seed user (their sessions cascade). Only warehouse
 * settings and the seed users are kept.
 */
export async function deleteAllData() {
  const { deleted, mediaPaths } = await withTransaction(async (execute) => {
    const mediaRows = await execute(`SELECT storage_path AS storagePath FROM media`);

    // Child tables first: stock/stock_ledger RESTRICT products; dispatches RESTRICT
    // orders (fk_dispatches_order_id) so it must go before orders; products RESTRICT
    // categories/sub-categories, which RESTRICT up the catalog tree; orders and media
    // RESTRICT users. order_items, product_gallery_images, media_usage and
    // refresh_tokens all cascade from their parents.
    const deleted = {
      stock: (await execute(`DELETE FROM stock`)).affectedRows,
      stockLedger: (await execute(`DELETE FROM stock_ledger`)).affectedRows,
      dispatches: (await execute(`DELETE FROM dispatches`)).affectedRows,
      orders: (await execute(`DELETE FROM orders`)).affectedRows,
      products: (await execute(`DELETE FROM products`)).affectedRows,
      subCategories: (await execute(`DELETE FROM sub_categories`)).affectedRows,
      categories: (await execute(`DELETE FROM categories`)).affectedRows,
      divisions: (await execute(`DELETE FROM divisions`)).affectedRows,
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
