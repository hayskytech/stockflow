import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { createStockSchema, idParamSchema, listStockQuerySchema } from './stock.schema.js';
import * as stockService from './stock.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/stock */
export async function listStock(req, res, next) {
  try {
    const filters = parseOrThrow(listStockQuerySchema, {
      productId: req.query.product_id,
      invoiceNo: req.query.invoice_no,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
    });
    const { rows, total } = await stockService.listStock(req.business.id, req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/stock/:id */
export async function getStock(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const stock = await stockService.getStockById(req.business.id, id);
    res.status(200).json(stock);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/stock/import */
export async function importStock(req, res, next) {
  try {
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const result = await stockService.importStock(req.business.id, req.file.buffer, req.file.originalname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/stock/import-template */
export async function downloadStockImportTemplate(req, res, next) {
  try {
    const buffer = await stockService.getStockImportTemplate();
    res.status(200);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="stock-import-template.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/stock — create one stock intake batch against a product/invoice */
export async function createStock(req, res, next) {
  try {
    const input = parseOrThrow(createStockSchema, req.body);
    const result = await stockService.createStockBatch(req.business.id, input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/b/:businessId/stock/:id */
export async function deleteStock(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    await stockService.deleteStockBatch(req.business.id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
