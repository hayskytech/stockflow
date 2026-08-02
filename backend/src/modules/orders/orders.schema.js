import { z } from 'zod';

const uuidField = z.string().uuid('Invalid id');
// Same regexes as frontend/src/features/checkout/checkout.schema.js — client/server validation must agree.
const phoneField = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number');
const pincodeField = z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode');

const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product id'),
  quantity: z.number().int('Quantity must be a whole number').positive('Quantity must be at least 1'),
});

/** POST /api/orders */
export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    // 'offline' = manual order entered by admin/staff, payment settled outside the app —
    // no transaction id. The controller enforces that only admin/staff may use it.
    paymentMethod: z.enum(['bank_transfer', 'offline']).default('bank_transfer'),
    transactionId: z.string().trim().min(6, 'Enter a valid transaction id').max(100, 'Transaction id is too long').optional(),
    // Admin/staff only: place the order on behalf of this customer (controller enforces role).
    requestedFor: uuidField.optional(),
    // Opt-in: let a line through even if quantity_available is short — that line becomes a
    // back-order, fulfilled later once stock lands, instead of blocking the whole order.
    allowBackorder: z.boolean().optional(),
    shippingName: z.string().trim().min(2, 'Full name is required').max(100, 'Too long'),
    shippingPhone: phoneField,
    shippingAddressLine1: z.string().trim().min(3, 'Address is required').max(200, 'Too long'),
    shippingAddressLine2: z.string().trim().max(200, 'Too long').optional().or(z.literal('')),
    shippingCity: z.string().trim().min(2, 'City is required').max(100, 'Too long'),
    shippingState: z.string().trim().min(2, 'State is required').max(100, 'Too long'),
    shippingPincode: pincodeField,
    notes: z.string().trim().max(500, 'Too long').optional().or(z.literal('')),
    idempotencyKey: z.string().uuid('Invalid idempotency key'),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'bank_transfer' && !data.transactionId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['transactionId'], message: 'Enter a valid transaction id' });
    }
  });

/** PATCH /api/orders/:id/status */
export const updateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'cancelled', 'dispatched', 'completed']),
});

/** PATCH /api/orders/:id/payment-status */
export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['verified', 'rejected']),
});

/** GET /api/orders?status=...&date_from=...&date_to=...&scope=own|all */
export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'dispatched', 'completed', 'cancelled']).optional(),
  dateFrom: z.string().trim().min(1).optional(),
  dateTo: z.string().trim().min(1).optional(),
  // 'own' restricts results to the requester's own orders even for admin/staff — used by the
  // storefront "My Orders" screen when an admin/staff account browses the store as a shopper.
  // A `customer` requester is always restricted to their own orders regardless of this value.
  scope: z.enum(['own', 'all']).optional(),
  // Admin/staff only — the UserView "Orders"/"Payments" tabs filter to one specific user's orders.
  customerId: uuidField.optional(),
  isBackorder: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const idParamSchema = z.object({ id: uuidField });
