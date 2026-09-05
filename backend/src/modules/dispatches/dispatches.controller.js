import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { createDispatchSchema, idParamSchema, listDispatchesQuerySchema } from './dispatches.schema.js';
import * as dispatchesService from './dispatches.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/dispatches */
export async function listDispatches(req, res, next) {
  try {
    const filters = parseOrThrow(listDispatchesQuerySchema, {
      orderId: req.query.order_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
    });
    const { rows, total } = await dispatchesService.listDispatches(req.business.id, req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/dispatches/:id */
export async function getDispatch(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const dispatch = await dispatchesService.getDispatchById(req.business.id, id);
    res.status(200).json(dispatch);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/dispatches — dispatch of an accepted order */
export async function createDispatch(req, res, next) {
  try {
    const input = parseOrThrow(createDispatchSchema, req.body);
    const result = await dispatchesService.createDispatch(req.business.id, input, req.user.sub);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
