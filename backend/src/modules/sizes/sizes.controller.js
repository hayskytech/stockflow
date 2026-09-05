import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { createSizeSchema, idParamSchema, reorderSizesSchema, updateSizeSchema } from './sizes.schema.js';
import * as sizesService from './sizes.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/sizes */
export async function listSizes(req, res, next) {
  try {
    const { rows, total } = await sizesService.listSizes(req.business.id, req.listQuery);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/sizes */
export async function createSize(req, res, next) {
  try {
    const input = parseOrThrow(createSizeSchema, req.body);
    const size = await sizesService.createSize(req.business.id, input);
    res.status(201).json(size);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/b/:businessId/sizes/:id */
export async function updateSize(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateSizeSchema, req.body);
    const size = await sizesService.updateSize(req.business.id, id, input);
    res.status(200).json(size);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/sizes/:id */
export async function deleteSize(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await sizesService.deleteSize(req.business.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/sizes/reorder */
export async function reorderSizes(req, res, next) {
  try {
    const { orderedIds } = parseOrThrow(reorderSizesSchema, req.body);
    await sizesService.reorderSizes(req.business.id, orderedIds);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
