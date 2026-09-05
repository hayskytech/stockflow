import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import {
  createHeroSlideSchema,
  idParamSchema,
  reorderHeroSlidesSchema,
  updateHeroSlideSchema,
} from './heroSlides.schema.js';
import * as heroSlidesService from './heroSlides.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/hero-slides */
export async function listHeroSlides(req, res, next) {
  try {
    const { rows, total } = await heroSlidesService.listHeroSlides(req.business.id, req.listQuery);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/hero-slides/public — unauthenticated, active slides only, in display order */
export async function listPublicHeroSlides(req, res, next) {
  try {
    // TODO(storefront): needs business context when re-enabled
    const rows = await heroSlidesService.listActiveHeroSlides();
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/hero-slides */
export async function createHeroSlide(req, res, next) {
  try {
    const input = parseOrThrow(createHeroSlideSchema, req.body);
    const slide = await heroSlidesService.createHeroSlide(req.business.id, input);
    res.status(201).json(slide);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/b/:businessId/hero-slides/:id */
export async function updateHeroSlide(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const input = parseOrThrow(updateHeroSlideSchema, req.body);
    const slide = await heroSlidesService.updateHeroSlide(req.business.id, id, input);
    res.status(200).json(slide);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/hero-slides/:id */
export async function deleteHeroSlide(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await heroSlidesService.deleteHeroSlide(req.business.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/hero-slides/reorder */
export async function reorderHeroSlides(req, res, next) {
  try {
    const { orderedIds } = parseOrThrow(reorderHeroSlidesSchema, req.body);
    await heroSlidesService.reorderHeroSlides(req.business.id, orderedIds);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
