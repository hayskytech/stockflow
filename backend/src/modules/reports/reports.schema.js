import { z } from 'zod';

/** GET /api/reports/order-history?days= — trend window for the daily orders series. */
export const orderHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
});

/** GET /api/reports/stock-movement?days= — trend window for the daily in/out series. */
export const stockMovementQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
});

/** GET /api/reports/monthly-orders?months= — trend window for the monthly orders/amount series. */
export const monthlyOrderSummaryQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional().default(6),
});
