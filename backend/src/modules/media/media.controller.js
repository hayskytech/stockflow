import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { attachUsageSchema, detachUsageSchema, idParamSchema, listMediaQuerySchema } from './media.schema.js';
import * as mediaService from './media.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** POST /api/media — multipart upload, one file per request (Uppy sends one request per file). */
export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file was uploaded');
    const media = await mediaService.processAndStoreImage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadedBy: req.user.sub,
    });
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
}

/** GET /api/media */
export async function listMedia(req, res, next) {
  try {
    const filters = parseOrThrow(listMediaQuerySchema, { unusedOnly: req.query.unused_only });
    const { rows, total } = await mediaService.listMedia(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/media/:id */
export async function getMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const media = await mediaService.getMediaById(id);
    res.status(200).json(media);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/media/:id */
export async function deleteMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await mediaService.deleteMedia(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/media/:id/usage — records that an entity now references this media item. */
export async function attachUsage(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { entityType, entityId } = parseOrThrow(attachUsageSchema, req.body);
    await mediaService.attachUsage(id, entityType, entityId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/media/:id/usage — removes an entity's reference to this media item. */
export async function detachUsage(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { entityType, entityId } = parseOrThrow(detachUsageSchema, req.body);
    await mediaService.detachUsage(id, entityType, entityId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/media/sweep-orphans — admin-triggered (e.g. via cPanel cron) cleanup of unused uploads. */
export async function sweepOrphans(req, res, next) {
  try {
    const result = await mediaService.sweepOrphans();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
