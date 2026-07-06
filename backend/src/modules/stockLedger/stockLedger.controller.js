import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import { listStockLedgerQuerySchema } from './stockLedger.schema.js';
import * as stockLedgerService from './stockLedger.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/stock-ledger */
export async function listStockLedger(req, res, next) {
  try {
    const filters = parseOrThrow(listStockLedgerQuerySchema, {
      productId: req.query.product_id,
      changeType: req.query.change_type,
      referenceType: req.query.reference_type,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
    });
    const { rows, total } = await stockLedgerService.listStockLedger(req.listQuery, filters);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}
