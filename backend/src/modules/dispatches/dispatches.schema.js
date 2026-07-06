import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');

const barcodeField = z
  .string()
  .trim()
  .min(1, 'Barcode cannot be empty')
  .max(50, 'Barcode must be 50 characters or less');

/** GET /api/dispatches?order_id=&date_from=&date_to= */
export const listDispatchesQuerySchema = z.object({
  orderId: uuidField.optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
});

export const idParamSchema = z.object({ id: uuidField });

/** POST /api/dispatches — scan-verified dispatch of an accepted order. */
export const createDispatchSchema = z.object({
  orderId: uuidField,
  barcodes: z.array(barcodeField).min(1, 'Scan at least one barcode').max(2000, 'A single dispatch is capped at 2000 barcodes'),
  courierName: z.string().trim().max(100, 'Courier name must be 100 characters or less').optional(),
  awbNumber: z.string().trim().max(100, 'AWB number must be 100 characters or less').optional(),
  note: z.string().trim().max(500, 'Note must be 500 characters or less').optional(),
});

/** POST /api/dispatches/barcode-status — advisory per-barcode check while scanning against an order. */
export const barcodeStatusSchema = z.object({
  orderId: uuidField,
  barcodes: z.array(barcodeField).min(1).max(100),
});

/** POST /api/dispatches/import — multipart form fields accompanying the barcode file. */
export const importDispatchFieldsSchema = z.object({
  orderId: uuidField,
  courierName: z.string().trim().max(100, 'Courier name must be 100 characters or less').optional(),
  awbNumber: z.string().trim().max(100, 'AWB number must be 100 characters or less').optional(),
  note: z.string().trim().max(500, 'Note must be 500 characters or less').optional(),
});
