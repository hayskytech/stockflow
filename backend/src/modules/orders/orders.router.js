import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { pagination } from '../../middleware/pagination.js';
import { orderLimiter } from '../../middleware/rateLimiter.js';
import { requireRole } from '../../middleware/requireRole.js';
import { createOrder, getOrder, listOrders, updateOrderStatus, updatePaymentStatus } from './orders.controller.js';

export const ordersRouter = Router();

const ordersPagination = pagination({
  sortable: ['created_at', 'status', 'total_amount'],
  defaultSort: 'created_at',
});

// List/detail carry no role restriction — the service scopes results to the requester's own
// orders when role is `customer`, or when `?scope=own` is passed (used by the storefront "My
// Orders" screen for any role); admin/staff otherwise see everything (see orders.service.js).
ordersRouter.get('/', authenticate, ordersPagination, listOrders);
ordersRouter.get('/:id', authenticate, getOrder);
ordersRouter.post('/', authenticate, orderLimiter, createOrder);
// Accept/reject (admin/staff) and self-cancel (customer, own pending order) share one endpoint —
// the service enforces who may set which status.
ordersRouter.patch('/:id/status', authenticate, updateOrderStatus);
ordersRouter.patch('/:id/payment-status', authenticate, requireRole('admin', 'staff'), updatePaymentStatus);
