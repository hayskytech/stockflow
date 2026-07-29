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

/** New slides join at the end of manual drag-and-drop order, not the front (sort_order 0). */
async function nextSortOrder() {
  const [row] = await executeQuery(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM hero_slides`);
  return row.next;
}

export async function listHeroSlides(listQuery) {
  const { perPage, offset, orderby, order } = listQuery;

  const [rows, countRows] = await Promise.all([
    executeQuery(`SELECT ${HERO_SLIDE_COLUMNS} FROM hero_slides ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`, [
      perPage,
      offset,
    ]),
    executeQuery(`SELECT COUNT(*) AS total FROM hero_slides`),
  ]);

  return { rows, total: countRows[0].total };
}

/** Active slides only, in display order — used by the public/unauthenticated storefront homepage. */
export async function listActiveHeroSlides() {
  return executeQuery(`SELECT ${HERO_SLIDE_COLUMNS} FROM hero_slides WHERE is_active = TRUE ORDER BY sort_order ASC`);
}

export async function getHeroSlideById(id) {
  const [row] = await executeQuery(`SELECT ${HERO_SLIDE_COLUMNS} FROM hero_slides WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'Hero slide not found');
  return row;
}

export async function createHeroSlide(input) {
  const media = await getMediaById(input.mediaId); // 404s if the media item doesn't exist

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder();
  await executeQuery(
    `INSERT INTO hero_slides (id, media_id, media_url, link_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, media.id, media.url, input.linkUrl || null, input.isActive ?? true, sortOrder],
  );
  await attachUsage(media.id, MEDIA_ENTITY_TYPE, id);

  return getHeroSlideById(id);
}

/** Persists a full manual reorder — every existing slide id must be present exactly once. */
export async function reorderHeroSlides(orderedIds) {
  const existing = await executeQuery(`SELECT id FROM hero_slides`);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every hero slide exactly once');
  }

  await withTransaction(async (execute) => {
    await Promise.all(
      orderedIds.map((id, index) => execute(`UPDATE hero_slides SET sort_order = ? WHERE id = ?`, [index, id])),
    );
  });
}

export async function updateHeroSlide(id, input) {
  const existing = await getHeroSlideById(id);

  const fields = [];
  const params = [];

  if (input.mediaId !== undefined && input.mediaId !== existing.mediaId) {
    const media = await getMediaById(input.mediaId); // 404s if the media item doesn't exist
    await detachUsage(existing.mediaId, MEDIA_ENTITY_TYPE, id);
    await attachUsage(media.id, MEDIA_ENTITY_TYPE, id);
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

  params.push(id);
  await executeQuery(`UPDATE hero_slides SET ${fields.join(', ')} WHERE id = ?`, params);
  return getHeroSlideById(id);
}

export async function deleteHeroSlide(id) {
  const existing = await getHeroSlideById(id);
  await executeQuery(`DELETE FROM hero_slides WHERE id = ?`, [id]);
  await detachUsage(existing.mediaId, MEDIA_ENTITY_TYPE, id);
}
