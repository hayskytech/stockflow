import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD');

/** GET /api/stock-ledger?product_id=&change_type=&reference_type=&date_from=&date_to= */
export const listStockLedgerQuerySchema = z.object({
  productId: uuidField.optional(),
  changeType: z.enum(['in', 'out']).optional(),
  referenceType: z.enum(['order', 'adjustment', 'import']).optional(),
  dateFrom: dateField.optional(),
  dateTo: dateField.optional(),
});
