import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { attachUsage, detachUsage, getMediaById } from '../media/media.service.js';

const MEDIA_ENTITY_TYPE = 'hero_slide';

const HERO_SLIDE_COLUMNS = `
  id, media_id AS mediaId, media_url AS mediaUrl, link_url AS linkUrl,
  is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
`;

/** New slides join at the end of this business's manual drag-and-drop order, not the front. */
async function nextSortOrder(businessId) {
  const [row] = await executeQuery(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM hero_slides WHERE business_id = ?`,
    [businessId],
  );
  return row.next;
}

export async function listHeroSlides(businessId, listQuery) {
  const { perPage, offset, orderby, order } = listQuery;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${HERO_SLIDE_COLUMNS} FROM hero_slides WHERE business_id = ? ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [businessId, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM hero_slides WHERE business_id = ?`, [businessId]),
  ]);

  return { rows, total: countRows[0].total };
}

/**
 * Active slides only, in display order — used by the public/unauthenticated storefront homepage.
 * TODO(storefront): needs business context when re-enabled — the route is storefrontEnabled-gated
 * and 404s before this runs, so this query never executes while the storefront is off.
 */
export async function listActiveHeroSlides() {
  return [];
}

export async function getHeroSlideById(businessId, id) {
  const [row] = await executeQuery(
    `SELECT ${HERO_SLIDE_COLUMNS} FROM hero_slides WHERE id = ? AND business_id = ?`,
    [id, businessId],
  );
  if (!row) throw new AppError(404, 'Hero slide not found');
  return row;
}

export async function createHeroSlide(businessId, input) {
  const media = await getMediaById(businessId, input.mediaId); // 404s if the media item doesn't exist

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder(businessId);
  await executeQuery(
    `INSERT INTO hero_slides (id, business_id, media_id, media_url, link_url, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, businessId, media.id, media.url, input.linkUrl || null, input.isActive ?? true, sortOrder],
  );
  await attachUsage(businessId, media.id, MEDIA_ENTITY_TYPE, id);

  return getHeroSlideById(businessId, id);
}

/** Persists a full manual reorder — every existing slide id for this business must be present exactly once. */
export async function reorderHeroSlides(businessId, orderedIds) {
  const existing = await executeQuery(`SELECT id FROM hero_slides WHERE business_id = ?`, [businessId]);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every hero slide exactly once');
  }

  await withTransaction(async (execute) => {
    // Sequential — concurrent execute() on one transaction connection is unsafe.
    for (let index = 0; index < orderedIds.length; index += 1) {
      await execute(`UPDATE hero_slides SET sort_order = ? WHERE id = ? AND business_id = ?`, [
        index,
        orderedIds[index],
        businessId,
      ]);
    }
  });
}

export async function updateHeroSlide(businessId, id, input) {
  const existing = await getHeroSlideById(businessId, id);

  const fields = [];
  const params = [];

  if (input.mediaId !== undefined && input.mediaId !== existing.mediaId) {
    const media = await getMediaById(businessId, input.mediaId); // 404s if the media item doesn't exist
    await detachUsage(businessId, existing.mediaId, MEDIA_ENTITY_TYPE, id);
    await attachUsage(businessId, media.id, MEDIA_ENTITY_TYPE, id);
    fields.push('media_id = ?', 'media_url = ?');
    params.push(media.id, media.url);
  }
  if (input.linkUrl !== undefined) {
    fields.push('link_url = ?');
    params.push(input.linkUrl || null);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }

  if (fields.length === 0) return existing;

  params.push(id, businessId);
  await executeQuery(`UPDATE hero_slides SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`, params);
  return getHeroSlideById(businessId, id);
}

export async function deleteHeroSlide(businessId, id) {
  const existing = await getHeroSlideById(businessId, id);
  await executeQuery(`DELETE FROM hero_slides WHERE id = ? AND business_id = ?`, [id, businessId]);
  await detachUsage(businessId, existing.mediaId, MEDIA_ENTITY_TYPE, id);
}
