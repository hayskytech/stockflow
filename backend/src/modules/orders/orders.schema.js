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
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  transactionId: z.string().trim().min(6, 'Enter a valid transaction id').max(100, 'Transaction id is too long'),
  shippingName: z.string().trim().min(2, 'Full name is required').max(100, 'Too long'),
  shippingPhone: phoneField,
  shippingAddressLine1: z.string().trim().min(3, 'Address is required').max(200, 'Too long'),
  shippingAddressLine2: z.string().trim().max(200, 'Too long').optional().or(z.literal('')),
  shippingCity: z.string().trim().min(2, 'City is required').max(100, 'Too long'),
  shippingState: z.string().trim().min(2, 'State is required').max(100, 'Too long'),
  shippingPincode: pincodeField,
  notes: z.string().trim().max(500, 'Too long').optional().or(z.literal('')),
  idempotencyKey: z.string().uuid('Invalid idempotency key'),
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
});

export const idParamSchema = z.object({ id: uuidField });
