import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { ENV } from '../../config/env.js';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

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

export async function processAndStoreImage({ buffer, originalName, uploadedBy }) {
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

  const [existing] = await executeQuery(`SELECT ${MEDIA_COLUMNS} FROM media WHERE file_hash = ?`, [fileHash]);
  if (existing) return withUrl(existing); // dedup — identical content already stored, reuse it

  const finalMetadata = await sharp(webpBuffer).metadata();
  const storagePath = shardedPath(fileHash);
  const absolutePath = path.join(ENV.MEDIA_UPLOAD_DIR, storagePath);

  const id = crypto.randomUUID();
  await writeFileAtomic(absolutePath, webpBuffer);
  try {
    await executeQuery(
      `INSERT INTO media (id, file_hash, original_name, storage_path, mime_type, size_bytes, width, height, uploaded_by)
       VALUES (?, ?, ?, ?, 'image/webp', ?, ?, ?, ?)`,
      [id, fileHash, originalName ?? null, storagePath, webpBuffer.byteLength, finalMetadata.width, finalMetadata.height, uploadedBy],
    );
  } catch (err) {
    // DB insert failed after the file was already written — clean up the orphaned file so it
    // doesn't leak on disk with no corresponding row.
    await fs.unlink(absolutePath).catch(() => {});
    throw err;
  }

  const [row] = await executeQuery(`SELECT ${MEDIA_COLUMNS} FROM media WHERE id = ?`, [id]);
  return withUrl(row);
}

export async function listMedia(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('m.original_name LIKE ?');
    params.push(`%${search}%`);
  }
  const joins = filters.unusedOnly ? 'LEFT JOIN media_usage mu ON mu.media_id = m.id' : '';
  if (filters.unusedOnly) conditions.push('mu.id IS NULL');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = orderby === 'size_bytes' ? 'm.size_bytes' : 'm.created_at';

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${mediaColumns('m')} FROM media m ${joins} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(DISTINCT m.id) AS total FROM media m ${joins} ${where}`, params),
  ]);

  return { rows: rows.map(withUrl), total: countRows[0].total };
}

export async function getMediaById(id) {
  const [row] = await executeQuery(`SELECT ${MEDIA_COLUMNS} FROM media WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'Media not found');
  return withUrl(row);
}

export async function attachUsage(mediaId, entityType, entityId) {
  await getMediaById(mediaId); // 404s if it doesn't exist
  await executeQuery(
    `INSERT INTO media_usage (id, media_id, entity_type, entity_id) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [crypto.randomUUID(), mediaId, entityType, entityId],
  );
}

export async function detachUsage(mediaId, entityType, entityId) {
  await executeQuery(`DELETE FROM media_usage WHERE media_id = ? AND entity_type = ? AND entity_id = ?`, [
    mediaId,
    entityType,
    entityId,
  ]);
}

/** Deletes the DB row and the on-disk file. Refuses if any entity still references this media. */
export async function deleteMedia(id) {
  const media = await getMediaById(id);
  const [usageRows] = await executeQuery(`SELECT COUNT(*) AS total FROM media_usage WHERE media_id = ?`, [id]);
  if (usageRows.total > 0) {
    throw new AppError(409, 'This media item is still in use and cannot be deleted');
  }

  await executeQuery(`DELETE FROM media WHERE id = ?`, [id]);
  await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, media.storagePath)).catch((err) => {
    logger.error({ err, mediaId: id }, 'Failed to remove media file from disk after row deletion');
  });
}

/** Deletes media rows with no usage rows, older than MEDIA_ORPHAN_TTL_HOURS — catches abandoned uploads. */
export async function sweepOrphans() {
  const orphans = await executeQuery(
    `SELECT m.id, m.storage_path AS storagePath
       FROM media m
       LEFT JOIN media_usage mu ON mu.media_id = m.id
      WHERE mu.id IS NULL
        AND m.created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [ENV.MEDIA_ORPHAN_TTL_HOURS],
  );

  for (const orphan of orphans) {
    await executeQuery(`DELETE FROM media WHERE id = ?`, [orphan.id]);
    await fs.unlink(path.join(ENV.MEDIA_UPLOAD_DIR, orphan.storagePath)).catch((err) => {
      logger.error({ err, mediaId: orphan.id }, 'Failed to remove orphaned media file from disk');
    });
  }

  return { deleted: orphans.length };
}
