import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { attachUsageSchema, detachUsageSchema, idParamSchema, listMediaQuerySchema, renameMediaSchema } from './media.schema.js';
import * as mediaService from './media.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** POST /api/b/:businessId/media — multipart upload, one file per request (Uppy sends one request per file). */
export async function uploadMedia(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file was uploaded');
    const media = await mediaService.processAndStoreImage({
      businessId: req.business.id,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadedBy: req.user.sub,
    });
    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/media */
export async function listMedia(req, res, next) {
  try {
    const filters = parseOrThrow(listMediaQuerySchema, { unusedOnly: req.query.unused_only });
    const { rows, total } = await mediaService.listMedia(req.business.id, req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/media/:id */
export async function getMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const media = await mediaService.getMediaById(req.business.id, id);
    res.status(200).json(media);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/media/:id — renames the file's display name only, does not touch storage_path. */
export async function renameMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { originalName } = parseOrThrow(renameMediaSchema, req.body);
    const media = await mediaService.renameMedia(req.business.id, id, originalName);
    res.status(200).json(media);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/media/:id */
export async function deleteMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await mediaService.deleteMedia(req.business.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/media/:id/file — multipart upload, replaces the stored image but keeps the same id/usages. */
export async function replaceMediaFile(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    if (!req.file) throw new AppError(400, 'No file was uploaded');
    const media = await mediaService.replaceMediaFile(req.business.id, id, req.file.buffer, req.file.originalname);
    res.status(200).json(media);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/media/:id/usage — which entities (e.g. products) currently reference this media item. */
export async function getMediaUsage(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const usages = await mediaService.getMediaUsage(req.business.id, id);
    res.status(200).json(usages);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/media/:id/related — other media items sharing a usage entity with this one. */
export async function getRelatedMedia(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const related = await mediaService.getRelatedMedia(req.business.id, id);
    res.status(200).json(related);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/media/:id/usage — records that an entity now references this media item. */
export async function attachUsage(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { entityType, entityId } = parseOrThrow(attachUsageSchema, req.body);
    await mediaService.attachUsage(req.business.id, id, entityType, entityId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/media/:id/usage — removes an entity's reference to this media item. */
export async function detachUsage(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { entityType, entityId } = parseOrThrow(detachUsageSchema, req.body);
    await mediaService.detachUsage(req.business.id, id, entityType, entityId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/media/sweep-orphans — admin-triggered cleanup of this business's unused uploads. */
export async function sweepOrphans(req, res, next) {
  try {
    const result = await mediaService.sweepOrphans(req.business.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
