import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { idParamSchema, listStockQuerySchema } from './stock.schema.js';
import * as stockService from './stock.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/stock */
export async function listStock(req, res, next) {
  try {
    const filters = parseOrThrow(listStockQuerySchema, {
      productId: req.query.product_id,
      status: req.query.status,
      invoiceNo: req.query.invoice_no,
      orderId: req.query.order_id,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
    });
    const { rows, total } = await stockService.listStock(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/stock/:id */
export async function getStock(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const stock = await stockService.getStockById(id);
    res.status(200).json(stock);
  } catch (err) {
    next(err);
  }
}

/** POST /api/stock/import */
export async function importStock(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const result = await stockService.importStock(req.file.buffer, req.file.originalname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/stock/:id */
export async function deleteStock(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await stockService.deleteStock(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
