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

const barcodeField = z
  .string()
  .trim()
  .min(1, 'Barcode cannot be empty')
  .max(50, 'Barcode must be 50 characters or less');

const moneyField = z.coerce.number().min(0, 'Must be a number ≥ 0');

/** Today's date as YYYY-MM-DD, UTC — matches the plain DATE column and avoids locale-aware methods. */
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** POST /api/stock — bulk-create scanned units against one product/invoice. */
export const scanImportSchema = z
  .object({
    productId: uuidField,
    invoiceNo: z.string().trim().min(1, 'Invoice number is required').max(100, 'Invoice number must be 100 characters or less'),
    invoiceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invoice date must be YYYY-MM-DD').optional(),
    mrp: moneyField,
    wsp: moneyField,
    size: z.string().trim().max(20, 'Size must be 20 characters or less').optional(),
    note: z.string().trim().max(500, 'Note must be 500 characters or less').optional(),
    barcodes: z.array(barcodeField).min(1, 'Scan at least one barcode').max(500, 'A single import is capped at 500 barcodes'),
  })
  .refine((data) => data.wsp <= data.mrp, { message: 'WSP cannot be greater than MRP', path: ['wsp'] })
  .refine((data) => !data.invoiceDate || data.invoiceDate <= todayDateString(), {
    message: 'Invoice date cannot be in the future',
    path: ['invoiceDate'],
  });

/** POST /api/stock/barcode-status — advisory duplicate check while scanning. */
export const barcodeStatusSchema = z.object({
  barcodes: z.array(barcodeField).min(1).max(100),
});
