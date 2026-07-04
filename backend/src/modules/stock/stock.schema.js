import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

/** GET /api/stock?product_id=&status=&invoice_no=&order_id=&date_from=&date_to= */
export const listStockQuerySchema = z.object({
  productId: uuidField.optional(),
  status: z.enum(['in_stock', 'reserved', 'dispatched']).optional(),
  invoiceNo: z.string().trim().min(1).optional(),
  orderId: uuidField.optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({ id: uuidField });
