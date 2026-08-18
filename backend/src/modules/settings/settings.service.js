import fs from 'fs/promises';
import path from 'path';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { attachUsage, detachUsage, getMediaById } from '../media/media.service.js';
import { logger } from '../../utils/logger.js';

// Users created by database/init/02_seed.sql — the only rows that survive a data wipe.
const SEED_USER_IDS = [
  'a0000000-0000-4000-8000-000000000001', // admin@stockflow.local
  'a0000000-0000-4000-8000-000000000002', // staff@stockflow.local
];

/**
 * Dev-only wipe of all transactional data: stock, stock ledger, dispatches, orders
 * (+items via cascade), products (+gallery rows via cascade), the catalog tree
 * (sub-categories, categories, divisions), media (+usage rows via cascade, plus the
 * files on disk) and every non-seed user (their sessions cascade). Only warehouse
 * settings, social links and the seed users are kept — site_branding's logo/favicon
 * are cleared first since site_branding has a hard (non-cascading) FK into media and
 * would otherwise block the media wipe.
 */
export async function deleteAllData() {
  const { deleted, mediaPaths } = await withTransaction(async (execute) => {
    await execute(
      `UPDATE site_branding SET logo_media_id = NULL, logo_url = NULL, favicon_media_id = NULL, favicon_url = NULL WHERE id = 1`,
    );
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

const SOCIAL_LINKS_COLUMNS = `
  id, facebook_url AS facebookUrl, instagram_url AS instagramUrl,
  youtube_url AS youtubeUrl, whatsapp_url AS whatsappUrl,
  created_at AS createdAt, updated_at AS updatedAt
`;

const SOCIAL_LINKS_COLUMN_MAP = {
  facebookUrl: 'facebook_url',
  instagramUrl: 'instagram_url',
  youtubeUrl: 'youtube_url',
  whatsappUrl: 'whatsapp_url',
};

export async function getSocialLinks() {
  const [row] = await executeQuery(`SELECT ${SOCIAL_LINKS_COLUMNS} FROM social_links WHERE id = 1`);
  if (!row) throw new AppError(404, 'Social links have not been configured yet');
  return row;
}

/** Public subset for the unauthenticated storefront footer. */
export async function getPublicSocialLinks() {
  const [row] = await executeQuery(
    `SELECT facebook_url AS facebookUrl, instagram_url AS instagramUrl,
            youtube_url AS youtubeUrl, whatsapp_url AS whatsappUrl
     FROM social_links WHERE id = 1`,
  );
  return {
    facebookUrl: row?.facebookUrl ?? null,
    instagramUrl: row?.instagramUrl ?? null,
    youtubeUrl: row?.youtubeUrl ?? null,
    whatsappUrl: row?.whatsappUrl ?? null,
  };
}

export async function updateSocialLinks(input) {
  await getSocialLinks(); // 404s if the single settings row doesn't exist yet

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(SOCIAL_LINKS_COLUMN_MAP)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key] === '' ? null : input[key]);
    }
  }
  if (fields.length === 0) return getSocialLinks();

  params.push(1);
  await executeQuery(`UPDATE social_links SET ${fields.join(', ')} WHERE id = ?`, params);
  return getSocialLinks();
}

const SITE_BRANDING_COLUMNS = `
  id, logo_media_id AS logoMediaId, logo_url AS logoUrl,
  favicon_media_id AS faviconMediaId, favicon_url AS faviconUrl,
  created_at AS createdAt, updated_at AS updatedAt
`;

// Single-row settings, not a real media_usage entity — a fixed placeholder id lets the logo and
// favicon each track their own usage row (differentiated by entity_type) via the same helpers
// hero_slides uses, instead of inventing a parallel usage-tracking mechanism just for this row.
const SITE_BRANDING_USAGE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';
const SITE_LOGO_ENTITY_TYPE = 'site_logo';
const SITE_FAVICON_ENTITY_TYPE = 'site_favicon';

export async function getSiteBranding() {
  const [row] = await executeQuery(`SELECT ${SITE_BRANDING_COLUMNS} FROM site_branding WHERE id = 1`);
  if (!row) throw new AppError(404, 'Site branding has not been configured yet');
  return row;
}

/** Public subset for unauthenticated screens — the storefront header (logo) and browser tab (favicon). */
export async function getPublicSiteBranding() {
  const [row] = await executeQuery(`SELECT logo_url AS logoUrl, favicon_url AS faviconUrl FROM site_branding WHERE id = 1`);
  return {
    logoUrl: row?.logoUrl ?? null,
    faviconUrl: row?.faviconUrl ?? null,
  };
}

export async function updateSiteBranding(input) {
  const existing = await getSiteBranding(); // 404s if the single settings row doesn't exist yet

  const fields = [];
  const params = [];

  if (input.logoMediaId !== undefined) {
    // Resolve the new media first — if the id is invalid this throws before anything changes,
    // instead of detaching the old logo's usage and then failing.
    const media = input.logoMediaId ? await getMediaById(input.logoMediaId) : null;
    if (existing.logoMediaId) await detachUsage(existing.logoMediaId, SITE_LOGO_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    if (media) await attachUsage(media.id, SITE_LOGO_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    fields.push('logo_media_id = ?', 'logo_url = ?');
    params.push(media?.id ?? null, media?.url ?? null);
  }

  if (input.faviconMediaId !== undefined) {
    const media = input.faviconMediaId ? await getMediaById(input.faviconMediaId) : null;
    if (existing.faviconMediaId) await detachUsage(existing.faviconMediaId, SITE_FAVICON_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    if (media) await attachUsage(media.id, SITE_FAVICON_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    fields.push('favicon_media_id = ?', 'favicon_url = ?');
    params.push(media?.id ?? null, media?.url ?? null);
  }

  if (fields.length === 0) return existing;

  params.push(1);
  await executeQuery(`UPDATE site_branding SET ${fields.join(', ')} WHERE id = ?`, params);
  return getSiteBranding();
}
