import { AppError } from '../../middleware/errorHandler.js';
import { monthlyOrderSummaryQuerySchema, orderHistoryQuerySchema, stockMovementQuerySchema } from './reports.schema.js';
import * as reportsService from './reports.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/reports/stock-summary */
export async function getStockSummary(req, res, next) {
  try {
    const summary = await reportsService.getStockSummary(req.business.id);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/reports/stock-movement */
export async function getStockMovement(req, res, next) {
  try {
    const { days } = parseOrThrow(stockMovementQuerySchema, { days: req.query.days });
    const movement = await reportsService.getStockMovement(req.business.id, days);
    res.status(200).json(movement);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/reports/order-history */
export async function getOrderHistory(req, res, next) {
  try {
    const { days } = parseOrThrow(orderHistoryQuerySchema, { days: req.query.days });
    const history = await reportsService.getOrderHistory(req.business.id, days);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/reports/monthly-orders */
export async function getMonthlyOrderSummary(req, res, next) {
  try {
    const { months } = parseOrThrow(monthlyOrderSummaryQuerySchema, { months: req.query.months });
    const summary = await reportsService.getMonthlyOrderSummary(req.business.id, months);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}
