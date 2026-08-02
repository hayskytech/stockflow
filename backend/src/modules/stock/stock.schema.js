import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

/** GET /api/stock?product_id=&invoice_no=&date_from=&date_to= */
export const listStockQuerySchema = z.object({
  productId: uuidField.optional(),
  invoiceNo: z.string().trim().min(1).optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({ id: uuidField });

const moneyField = z.coerce.number().min(0, 'Must be a number ≥ 0');
const discountPercentField = z.coerce.number().min(0, 'Must be zero or greater').max(100, 'Must be 100 or less');

/** Today's date as YYYY-MM-DD, UTC — matches the plain DATE column and avoids locale-aware methods. */
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** POST /api/stock — create one stock intake batch against a product/invoice. */
export const createStockSchema = z
  .object({
    productId: uuidField,
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity cannot exceed 10000'),
    invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(100, 'Invoice number must be 100 characters or less'),
    invoiceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invoice date must be YYYY-MM-DD').optional(),
    price: moneyField,
    discountPercent: discountPercentField.default(0),
    size: z.string().trim().max(20, 'Size must be 20 characters or less').optional(),
    note: z.string().trim().max(500, 'Note must be 500 characters or less').optional(),
  })
  .refine((data) => !data.invoiceDate || data.invoiceDate <= todayDateString(), {
    message: 'Invoice date cannot be in the future',
    path: ['invoiceDate'],
  });
