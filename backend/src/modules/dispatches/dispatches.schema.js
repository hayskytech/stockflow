import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

/** GET /api/dispatches?order_id=&date_from=&date_to= */
export const listDispatchesQuerySchema = z.object({
  orderId: uuidField.optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({ id: uuidField });

/** POST /api/dispatches — dispatch of an accepted order. */
export const createDispatchSchema = z.object({
  orderId: uuidField,
  courierName: z.string().trim().max(100, 'Courier name must be 100 characters or less').optional(),
  awbNumber: z.string().trim().max(100, 'AWB number must be 100 characters or less').optional(),
  note: z.string().trim().max(500, 'Note must be 500 characters or less').optional(),
});
