import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import {
  barcodeStatusSchema,
  createDispatchSchema,
  idParamSchema,
  importDispatchFieldsSchema,
  listDispatchesQuerySchema,
} from './dispatches.schema.js';
import * as dispatchesService from './dispatches.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/dispatches */
export async function listDispatches(req, res, next) {
  try {
    const filters = parseOrThrow(listDispatchesQuerySchema, {
      orderId: req.query.order_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
    });
    const { rows, total } = await dispatchesService.listDispatches(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/dispatches/:id */
export async function getDispatch(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const dispatch = await dispatchesService.getDispatchById(id);
    res.status(200).json(dispatch);
  } catch (err) {
    next(err);
  }
}

/** POST /api/dispatches — scan-verified dispatch of an accepted order */
export async function createDispatch(req, res, next) {
  try {
    const input = parseOrThrow(createDispatchSchema, req.body);
    const result = await dispatchesService.createDispatch(input, req.user.sub);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/dispatches/barcode-status — advisory per-barcode check while scanning */
export async function barcodeStatus(req, res, next) {
  try {
    const { orderId, barcodes } = parseOrThrow(barcodeStatusSchema, req.body);
    const results = await dispatchesService.checkBarcodesForOrder(orderId, barcodes);
    res.status(200).json({ results });
  } catch (err) {
    next(err);
  }
}

/** POST /api/dispatches/import — dispatch from an uploaded barcode file */
export async function importDispatch(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const fields = parseOrThrow(importDispatchFieldsSchema, {
      orderId: req.body.orderId,
      courierName: req.body.courierName || undefined,
      awbNumber: req.body.awbNumber || undefined,
      note: req.body.note || undefined,
    });
    const result = await dispatchesService.importDispatch(fields, req.file.buffer, req.file.originalname, req.user.sub);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
