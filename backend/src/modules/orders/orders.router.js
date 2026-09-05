import { Router } from 'express';
import { pagination } from '../../middleware/pagination.js';
import { orderLimiter } from '../../middleware/rateLimiter.js';
import { requireBusinessRole } from '../../middleware/requireBusinessRole.js';
import { createOrder, getOrder, listOrders, updateOrderStatus, updatePaymentStatus } from './orders.controller.js';

// Mounted in app.js at /api/b/:businessId/orders behind `authenticate, resolveBusiness`, so businessId
// comes from the route param (mergeParams) and every request already has an authenticated member.
export const ordersRouter = Router({ mergeParams: true });

const ordersPagination = pagination({
  sortable: ['created_at', 'status', 'total_amount'],
  defaultSort: 'created_at',
});

// List/detail are member-only — any admin/staff member of the business reads. The service still
// scopes results to the requester's own orders when `?scope=own` is passed, or honours a
// `?customer_id=` filter (used by the UserView "Orders"/"Payments" tabs).
ordersRouter.get('/', ordersPagination, listOrders);
ordersRouter.get('/:id', getOrder);
// Storefront is off — every order is now an internal/manual order placed by admin/staff.
ordersRouter.post('/', requireBusinessRole('admin', 'staff'), orderLimiter, createOrder);
ordersRouter.patch('/:id/status', requireBusinessRole('admin', 'staff'), updateOrderStatus);
ordersRouter.patch('/:id/payment-status', requireBusinessRole('admin', 'staff'), updatePaymentStatus);
