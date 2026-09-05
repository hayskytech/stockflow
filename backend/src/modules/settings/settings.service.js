import fs from 'fs/promises';
import path from 'path';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { attachUsage, detachUsage, getMediaById } from '../media/media.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Dev-only reset of a SINGLE business's data to empty — dev only (the controller rejects the
 * request outside NODE_ENV=development). Wipes this business's stock, stock ledger, dispatches,
 * orders (+items via cascade), products (+gallery rows via cascade), the catalog tree
 * (sub-categories, categories), hero slides, media (+usage rows, plus the files on disk) and blanks
 * its single-row settings (business_settings, notice, social_links, site_branding).
 *
 * Global tables (users, memberships, businesses, refresh_tokens, otp_requests) are never touched —
 * users are global now, shared across businesses.
 *
 * site_branding's logo/favicon media ids are nulled first: site_branding holds a hard
 * (non-cascading, RESTRICT) FK into media and would otherwise block the media wipe.
 */
export async function deleteAllData(businessId) {
  const { deleted, mediaPaths } = await withTransaction(async (execute) => {
    await execute(
      `UPDATE site_branding SET logo_media_id = NULL, logo_url = NULL, favicon_media_id = NULL, favicon_url = NULL
       WHERE business_id = ?`,
      [businessId],
    );
    const mediaRows = await execute(`SELECT storage_path AS storagePath FROM media WHERE business_id = ?`, [businessId]);

    // FK-safe order for one business:
    //   stock / stock_ledger RESTRICT products (fk_stock_product_id, fk_stock_ledger_product_id)
    //   dispatches RESTRICT orders (fk_dispatches_order_id) → dispatches before orders
    //   orders → order_items cascade (fk_order_items_order_id)
    //   products → product_gallery_images cascade (fk_product_gallery_product_id)
    //   products RESTRICT sub_categories / categories → products before the catalog tree
    //   media → media_usage cascade; deleted explicitly first for clarity
    const deleted = {
      stock: (await execute(`DELETE FROM stock WHERE business_id = ?`, [businessId])).affectedRows,
      stockLedger: (await execute(`DELETE FROM stock_ledger WHERE business_id = ?`, [businessId])).affectedRows,
      dispatches: (await execute(`DELETE FROM dispatches WHERE business_id = ?`, [businessId])).affectedRows,
      orders: (await execute(`DELETE FROM orders WHERE business_id = ?`, [businessId])).affectedRows,
      products: (await execute(`DELETE FROM products WHERE business_id = ?`, [businessId])).affectedRows,
      subCategories: (await execute(`DELETE FROM sub_categories WHERE business_id = ?`, [businessId])).affectedRows,
      categories: (await execute(`DELETE FROM categories WHERE business_id = ?`, [businessId])).affectedRows,
      heroSlides: (await execute(`DELETE FROM hero_slides WHERE business_id = ?`, [businessId])).affectedRows,
      mediaUsage: (await execute(`DELETE FROM media_usage WHERE business_id = ?`, [businessId])).affectedRows,
      media: (await execute(`DELETE FROM media WHERE business_id = ?`, [businessId])).affectedRows,
      businessSettings: (await execute(`DELETE FROM business_settings WHERE business_id = ?`, [businessId])).affectedRows,
      notice: (await execute(`DELETE FROM notice WHERE business_id = ?`, [businessId])).affectedRows,
      socialLinks: (await execute(`DELETE FROM social_links WHERE business_id = ?`, [businessId])).affectedRows,
      siteBranding: (await execute(`DELETE FROM site_branding WHERE business_id = ?`, [businessId])).affectedRows,
    };

    return { deleted, mediaPaths: mediaRows.map((row) => row.storagePath) };
  });

  // Files are removed only after the transaction commits — a rollback must not lose files.
  // media rows dedupe per business but the file on disk is content-hash-sharded and CAN be shared
  // by another business's media row, so unlink only the paths no surviving row still references.
  // A missing file is not fatal here.
  for (const storagePath of mediaPaths) {
    const [stillUsed] = await executeQuery(
      `SELECT 1 FROM media WHERE storage_path = ? LIMIT 1`,
      [storagePath],
    );
    if (stillUsed) continue;
    await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, storagePath)).catch((err) => {
      logger.error(`Failed to delete media file ${storagePath}: ${err.message}`);
    });
  }

  return deleted;
}

const SOCIAL_LINKS_COLUMNS = `
  business_id AS businessId, facebook_url AS facebookUrl, instagram_url AS instagramUrl,
  youtube_url AS youtubeUrl, whatsapp_url AS whatsappUrl,
  created_at AS createdAt, updated_at AS updatedAt
`;

const SOCIAL_LINKS_COLUMN_MAP = {
  facebookUrl: 'facebook_url',
  instagramUrl: 'instagram_url',
  youtubeUrl: 'youtube_url',
  whatsappUrl: 'whatsapp_url',
};

/** Values a business with no social_links row yet reads back. */
function defaultSocialLinks(businessId) {
  return {
    businessId,
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    whatsappUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

/** A business with no social_links row yet reads back the default object rather than a 404. */
export async function getSocialLinks(businessId) {
  const [row] = await executeQuery(`SELECT ${SOCIAL_LINKS_COLUMNS} FROM social_links WHERE business_id = ?`, [businessId]);
  return row ?? defaultSocialLinks(businessId);
}

/**
 * Public subset for the unauthenticated storefront footer.
 * TODO(storefront): needs business context when re-enabled — the route is storefrontEnabled-gated
 * and 404s before this runs, so this never executes while the storefront is off.
 */
export async function getPublicSocialLinks() {
  return {
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    whatsappUrl: null,
  };
}

/** Upsert — creates the social_links row on first write, merges into it thereafter. */
export async function updateSocialLinks(businessId, input) {
  const columns = [];
  const placeholders = [];
  const params = [];
  const updates = [];
  for (const [key, column] of Object.entries(SOCIAL_LINKS_COLUMN_MAP)) {
    if (input[key] !== undefined) {
      columns.push(column);
      placeholders.push('?');
      params.push(input[key] === '' ? null : input[key]);
      updates.push(`${column} = VALUES(${column})`);
    }
  }

  if (columns.length === 0) return getSocialLinks(businessId);

  await executeQuery(
    `INSERT INTO social_links (business_id, ${columns.join(', ')})
     VALUES (?, ${placeholders.join(', ')})
     ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
    [businessId, ...params],
  );

  return getSocialLinks(businessId);
}

const SITE_BRANDING_COLUMNS = `
  business_id AS businessId, logo_media_id AS logoMediaId, logo_url AS logoUrl,
  favicon_media_id AS faviconMediaId, favicon_url AS faviconUrl,
  created_at AS createdAt, updated_at AS updatedAt
`;

// Single-row settings, not a real media_usage entity — a fixed placeholder id lets the logo and
// favicon each track their own usage row (differentiated by entity_type) via the same helpers
// hero_slides uses, instead of inventing a parallel usage-tracking mechanism just for this row.
const SITE_BRANDING_USAGE_ENTITY_ID = '00000000-0000-0000-0000-000000000000';
const SITE_LOGO_ENTITY_TYPE = 'site_logo';
const SITE_FAVICON_ENTITY_TYPE = 'site_favicon';

/** Values a business with no site_branding row yet reads back. */
function defaultSiteBranding(businessId) {
  return {
    businessId,
    logoMediaId: null,
    logoUrl: null,
    faviconMediaId: null,
    faviconUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

/** A business with no site_branding row yet reads back the default object rather than a 404. */
export async function getSiteBranding(businessId) {
  const [row] = await executeQuery(`SELECT ${SITE_BRANDING_COLUMNS} FROM site_branding WHERE business_id = ?`, [businessId]);
  return row ?? defaultSiteBranding(businessId);
}

/**
 * Public subset for unauthenticated screens — the storefront header (logo) and browser tab (favicon).
 * TODO(storefront): needs business context when re-enabled — the route is storefrontEnabled-gated
 * and 404s before this runs, so this never executes while the storefront is off.
 */
export async function getPublicSiteBranding() {
  return {
    logoUrl: null,
    faviconUrl: null,
  };
}

/** Upsert — creates the site_branding row on first write, merges into it thereafter. */
export async function updateSiteBranding(businessId, input) {
  const existing = await getSiteBranding(businessId);

  const fields = [];
  const params = [];

  if (input.logoMediaId !== undefined) {
    // Resolve the new media first — if the id is invalid this throws before anything changes,
    // instead of detaching the old logo's usage and then failing.
    const media = input.logoMediaId ? await getMediaById(businessId, input.logoMediaId) : null;
    if (existing.logoMediaId) {
      await detachUsage(businessId, existing.logoMediaId, SITE_LOGO_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    }
    if (media) await attachUsage(businessId, media.id, SITE_LOGO_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    fields.push('logo_media_id', 'logo_url');
    params.push(media?.id ?? null, media?.url ?? null);
  }

  if (input.faviconMediaId !== undefined) {
    const media = input.faviconMediaId ? await getMediaById(businessId, input.faviconMediaId) : null;
    if (existing.faviconMediaId) {
      await detachUsage(businessId, existing.faviconMediaId, SITE_FAVICON_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    }
    if (media) await attachUsage(businessId, media.id, SITE_FAVICON_ENTITY_TYPE, SITE_BRANDING_USAGE_ENTITY_ID);
    fields.push('favicon_media_id', 'favicon_url');
    params.push(media?.id ?? null, media?.url ?? null);
  }

  if (fields.length === 0) return existing;

  const placeholders = fields.map(() => '?');
  const updates = fields.map((column) => `${column} = VALUES(${column})`);
  await executeQuery(
    `INSERT INTO site_branding (business_id, ${fields.join(', ')})
     VALUES (?, ${placeholders.join(', ')})
     ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
    [businessId, ...params],
  );

  return getSiteBranding(businessId);
}
