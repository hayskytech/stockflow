import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * Media is per-business — every row is owned by one `business_id` and never shared. Dedup is
 * per-business too (uq_media_business_file_hash). `media_usage` rows carry a denormalized
 * `business_id` (from the media row) so tenant filtering stays a flat `WHERE business_id = ?`.
 *
 * NOTE: the files on disk are sharded purely by content hash, so two businesses that upload
 * byte-identical images share one file. The media *table* is tenant-isolated; the bytes on disk
 * are not. Acceptable for now (see multitenant_plan.md §5 / static-serving note in app.js).
 */

/** Column list for SELECTs against `media` — `alias` lets list queries qualify columns for their join. */
function mediaColumns(alias = '') {
  const p = alias ? `${alias}.` : '';
  return `
    ${p}id, ${p}file_hash AS fileHash, ${p}original_name AS originalName, ${p}storage_path AS storagePath,
    ${p}mime_type AS mimeType, ${p}size_bytes AS sizeBytes, ${p}width, ${p}height,
    ${p}uploaded_by AS uploadedBy, ${p}created_at AS createdAt, ${p}updated_at AS updatedAt
  `;
}
const MEDIA_COLUMNS = mediaColumns();

/** Same as mediaColumns() plus the uploader's display name — requires `LEFT JOIN users u ON u.id = <alias>.uploaded_by`. */
function mediaColumnsWithUploader(alias) {
  return `${mediaColumns(alias)}, u.name AS uploadedByName`;
}

// Guards against decompression-bomb style inputs before sharp does any real work.
const MAX_INPUT_DIMENSION = 8000;
const MAX_OUTPUT_DIMENSION = 2000;
const MIN_WEBP_QUALITY = 40;

function toPublicUrl(storagePath) {
  return `${ENV.MEDIA_PUBLIC_PATH}/${storagePath}`;
}

function withUrl(row) {
  return { ...row, url: toPublicUrl(row.storagePath) };
}

/** Encodes to WebP, shrinking quality then dimensions until it fits under MEDIA_MAX_BYTES. */
async function compressToWebp(buffer, metadata) {
  let pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_DIMENSION * MAX_INPUT_DIMENSION });
  const needsResize = metadata.width > MAX_OUTPUT_DIMENSION || metadata.height > MAX_OUTPUT_DIMENSION;
  if (needsResize) {
    pipeline = pipeline.resize({
      width: MAX_OUTPUT_DIMENSION,
      height: MAX_OUTPUT_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  // Strip EXIF/GPS metadata by not calling .withMetadata() — sharp omits it by default.

  for (let quality = 80; quality >= MIN_WEBP_QUALITY; quality -= 10) {
    const output = await pipeline.clone().webp({ quality }).toBuffer();
    if (output.byteLength <= ENV.MEDIA_MAX_BYTES) return output;
  }

  // Still too large at the lowest acceptable quality — shrink dimensions further and retry once.
  const shrunk = await pipeline
    .clone()
    .resize({ width: Math.round(MAX_OUTPUT_DIMENSION * 0.6), withoutEnlargement: true })
    .webp({ quality: MIN_WEBP_QUALITY })
    .toBuffer();
  if (shrunk.byteLength <= ENV.MEDIA_MAX_BYTES) return shrunk;

  throw new AppError(422, 'Image could not be compressed under the size limit — try a simpler image');
}

function shardedPath(hash) {
  return path.posix.join(hash.slice(0, 2), hash.slice(2, 4), `${hash}.webp`);
}

/** Writes to a temp file then renames into place — avoids partially-written files at the final path. */
async function writeFileAtomic(absolutePath, buffer) {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const tempPath = `${absolutePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, absolutePath);
}

export async function processAndStoreImage({ businessId, buffer, originalName, uploadedBy }) {
  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_DIMENSION * MAX_INPUT_DIMENSION }).metadata();
  } catch {
    throw new AppError(400, 'File is not a valid image');
  }
  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'File is not a valid image');
  }

  const webpBuffer = await compressToWebp(buffer, metadata);
  const fileHash = crypto.createHash('sha256').update(webpBuffer).digest('hex');

  const [existing] = await executeQuery(
    `SELECT ${MEDIA_COLUMNS} FROM media WHERE business_id = ? AND file_hash = ?`,
    [businessId, fileHash],
  );
  if (existing) return withUrl(existing); // per-business dedup — this business already has this content

  const finalMetadata = await sharp(webpBuffer).metadata();
  const storagePath = shardedPath(fileHash);
  const absolutePath = path.join(ENV.MEDIA_UPLOAD_DIR, storagePath);

  const id = crypto.randomUUID();
  await writeFileAtomic(absolutePath, webpBuffer);
  try {
    await executeQuery(
      `INSERT INTO media (id, business_id, file_hash, original_name, storage_path, mime_type, size_bytes, width, height, uploaded_by)
       VALUES (?, ?, ?, ?, ?, 'image/webp', ?, ?, ?, ?)`,
      [id, businessId, fileHash, originalName ?? null, storagePath, webpBuffer.byteLength, finalMetadata.width, finalMetadata.height, uploadedBy],
    );
  } catch (err) {
    // DB insert failed after the file was already written — clean up the orphaned file so it
    // doesn't leak on disk with no corresponding row.
    await fs.unlink(absolutePath).catch(() => {});
    throw err;
  }

  return getMediaById(businessId, id);
}

export async function listMedia(businessId, listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['m.business_id = ?'];
  const params = [businessId];
  if (search) {
    conditions.push('m.original_name LIKE ?');
    params.push(`%${search}%`);
  }
  const joins = filters.unusedOnly ? 'LEFT JOIN media_usage mu ON mu.media_id = m.id' : '';
  if (filters.unusedOnly) conditions.push('mu.id IS NULL');
  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderColumn = orderby === 'size_bytes' ? 'm.size_bytes' : 'm.created_at';

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${mediaColumnsWithUploader('m')} FROM media m LEFT JOIN users u ON u.id = m.uploaded_by ${joins} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(DISTINCT m.id) AS total FROM media m ${joins} ${where}`, params),
  ]);

  return { rows: rows.map(withUrl), total: countRows[0].total };
}

export async function getMediaById(businessId, id) {
  const [row] = await executeQuery(
    `SELECT ${mediaColumnsWithUploader('m')} FROM media m LEFT JOIN users u ON u.id = m.uploaded_by WHERE m.id = ? AND m.business_id = ?`,
    [id, businessId],
  );
  if (!row) throw new AppError(404, 'Media not found');
  return withUrl(row);
}

export async function renameMedia(businessId, id, originalName) {
  await getMediaById(businessId, id); // 404s if it doesn't exist in this business
  await executeQuery(`UPDATE media SET original_name = ? WHERE id = ? AND business_id = ?`, [originalName, id, businessId]);
  return getMediaById(businessId, id);
}

export async function attachUsage(businessId, mediaId, entityType, entityId) {
  await getMediaById(businessId, mediaId); // 404s if it doesn't exist in this business
  await executeQuery(
    `INSERT INTO media_usage (id, business_id, media_id, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [crypto.randomUUID(), businessId, mediaId, entityType, entityId],
  );
}

export async function detachUsage(businessId, mediaId, entityType, entityId) {
  await executeQuery(
    `DELETE FROM media_usage WHERE business_id = ? AND media_id = ? AND entity_type = ? AND entity_id = ?`,
    [businessId, mediaId, entityType, entityId],
  );
}

/** Which entities currently reference this media item — used to explain a blocked delete. */
export async function getMediaUsage(businessId, mediaId) {
  await getMediaById(businessId, mediaId); // 404s if it doesn't exist in this business
  return executeQuery(
    `SELECT mu.entity_type AS entityType, mu.entity_id AS entityId, p.name AS productName, p.product_code AS productCode
       FROM media_usage mu
       LEFT JOIN products p ON p.id = mu.entity_id AND mu.entity_type = 'product'
      WHERE mu.media_id = ? AND mu.business_id = ?`,
    [mediaId, businessId],
  );
}

/** Other media items that share a usage entity with this one (e.g. another photo of the same product). */
export async function getRelatedMedia(businessId, mediaId) {
  await getMediaById(businessId, mediaId); // 404s if it doesn't exist in this business
  const rows = await executeQuery(
    `SELECT DISTINCT ${mediaColumns('m2')}
       FROM media_usage mu1
       JOIN media_usage mu2 ON mu2.entity_type = mu1.entity_type AND mu2.entity_id = mu1.entity_id
         AND mu2.media_id != mu1.media_id AND mu2.business_id = mu1.business_id
       JOIN media m2 ON m2.id = mu2.media_id
      WHERE mu1.media_id = ? AND mu1.business_id = ?
      ORDER BY m2.created_at DESC
      LIMIT 12`,
    [mediaId, businessId],
  );
  return rows.map(withUrl);
}

/** Deletes the DB row and the on-disk file. Refuses if any entity still references this media. */
export async function deleteMedia(businessId, id) {
  const media = await getMediaById(businessId, id);
  const usages = await getMediaUsage(businessId, id);
  if (usages.length > 0) {
    const names = usages.map((u) => u.productName ?? `${u.entityType} ${u.entityId}`).join(', ');
    throw new AppError(409, `This media item is still used by: ${names}`, { usages });
  }

  await executeQuery(`DELETE FROM media WHERE id = ? AND business_id = ?`, [id, businessId]);
  await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, media.storagePath)).catch((err) => {
    logger.error({ err, mediaId: id }, 'Failed to remove media file from disk after row deletion');
  });
}

/** Re-processes and stores a new file for an existing media row, keeping the same id (and all its usages intact). */
export async function replaceMediaFile(businessId, id, buffer, originalName) {
  const existing = await getMediaById(businessId, id);

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_DIMENSION * MAX_INPUT_DIMENSION }).metadata();
  } catch {
    throw new AppError(400, 'File is not a valid image');
  }
  if (!metadata.width || !metadata.height) {
    throw new AppError(400, 'File is not a valid image');
  }

  const webpBuffer = await compressToWebp(buffer, metadata);
  const fileHash = crypto.createHash('sha256').update(webpBuffer).digest('hex');

  if (fileHash === existing.fileHash) {
    // Identical content — just allow the name to change, nothing else to do.
    if (originalName) {
      await executeQuery(`UPDATE media SET original_name = ? WHERE id = ? AND business_id = ?`, [originalName, id, businessId]);
    }
    return getMediaById(businessId, id);
  }

  const [collision] = await executeQuery(
    `SELECT id FROM media WHERE business_id = ? AND file_hash = ? AND id != ?`,
    [businessId, fileHash, id],
  );
  if (collision) {
    throw new AppError(409, 'This exact image already exists in the media library as another file');
  }

  const finalMetadata = await sharp(webpBuffer).metadata();
  const storagePath = shardedPath(fileHash);
  const absolutePath = path.join(ENV.MEDIA_UPLOAD_DIR, storagePath);
  await writeFileAtomic(absolutePath, webpBuffer);

  await executeQuery(
    `UPDATE media SET file_hash = ?, original_name = COALESCE(?, original_name), storage_path = ?,
       size_bytes = ?, width = ?, height = ? WHERE id = ? AND business_id = ?`,
    [fileHash, originalName ?? null, storagePath, webpBuffer.byteLength, finalMetadata.width, finalMetadata.height, id, businessId],
  );

  await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, existing.storagePath)).catch((err) => {
    logger.error({ err, mediaId: id }, 'Failed to remove old media file from disk after replace');
  });

  return getMediaById(businessId, id);
}

/** Deletes this business's media rows with no usage rows, older than MEDIA_ORPHAN_TTL_HOURS. */
export async function sweepOrphans(businessId) {
  const orphans = await executeQuery(
    `SELECT m.id, m.storage_path AS storagePath
       FROM media m
       LEFT JOIN media_usage mu ON mu.media_id = m.id
      WHERE m.business_id = ?
        AND mu.id IS NULL
        AND m.created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [businessId, ENV.MEDIA_ORPHAN_TTL_HOURS],
  );

  for (const orphan of orphans) {
    await executeQuery(`DELETE FROM media WHERE id = ? AND business_id = ?`, [orphan.id, businessId]);
    await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, orphan.storagePath)).catch((err) => {
      logger.error({ err, mediaId: orphan.id }, 'Failed to remove orphaned media file from disk');
    });
  }

  return { deleted: orphans.length };
}
