import { AppError } from '../../middleware/errorHandler.js';
import { setPaginationHeaders } from '../../middleware/pagination.js';
import {
  createOrderSchema,
  idParamSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from './orders.schema.js';
import * as ordersService from './orders.service.js';

function parseOrThrow(schema, data) {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/** GET /api/b/:businessId/orders */
export async function listOrders(req, res, next) {
  try {
    const filters = parseOrThrow(listOrdersQuerySchema, {
      status: req.query.status,
      dateFrom: req.query.date_from,
      dateTo: req.query.date_to,
      scope: req.query.scope,
      customerId: req.query.customer_id,
      isBackorder: req.query.is_backorder,
    });
    const { rows, total } = await ordersService.listOrders(req.business.id, req.listQuery, filters, req.user);
    setPaginationHeaders(res, total, req.listQuery.perPage);
    res.status(200).json(rows);
  } catch (err) {
    next(err);
  }
}

/** GET /api/b/:businessId/orders/:id */
export async function getOrder(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const order = await ordersService.getOrderById(req.business.id, id, req.user);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

/** POST /api/b/:businessId/orders — internal/manual order (storefront disabled) */
export async function createOrder(req, res, next) {
  try {
    const input = parseOrThrow(createOrderSchema, req.body);
    const order = await ordersService.createOrder(req.business.id, input, req.user.sub);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/orders/:id/status */
export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { status } = parseOrThrow(updateOrderStatusSchema, req.body);
    const order = await ordersService.updateOrderStatus(req.business.id, id, status, req.user);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/b/:businessId/orders/:id/payment-status */
export async function updatePaymentStatus(req, res, next) {
  try {
    const { id } = parseOrThrow(idParamSchema, req.params);
    const { paymentStatus } = parseOrThrow(updatePaymentStatusSchema, req.body);
    const order = await ordersService.updatePaymentStatus(req.business.id, id, paymentStatus, req.user);
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
}
