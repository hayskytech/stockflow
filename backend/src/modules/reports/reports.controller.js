import { AppError } from '../../middleware/errorHandler.js';
import { orderHistoryQuerySchema } from './reports.schema.js';
import * as reportsService from './reports.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/reports/stock-summary */
export async function getStockSummary(req, res, next) {
  try {
    const summary = await reportsService.getStockSummary();
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

/** GET /api/reports/order-history */
export async function getOrderHistory(req, res, next) {
  try {
    const { days } = parseOrThrow(orderHistoryQuerySchema, { days: req.query.days });
    const history = await reportsService.getOrderHistory(days);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}
