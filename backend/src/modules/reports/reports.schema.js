import { z } from 'zod';

/** GET /api/reports/order-history?days= — trend window for the daily orders series. */
export const orderHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
});
