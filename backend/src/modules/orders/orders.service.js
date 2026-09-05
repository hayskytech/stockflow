import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { effectivePrice } from '../../utils/pricing.js';

const ORDER_COLUMNS = `
  o.id, o.order_number AS orderNumber, o.status, o.is_backorder AS isBackorder,
  o.payment_method AS paymentMethod, o.transaction_id AS transactionId, o.payment_status AS paymentStatus,
  o.total_amount AS totalAmount,
  o.shipping_name AS shippingName, o.shipping_phone AS shippingPhone,
  o.shipping_address_line1 AS shippingAddressLine1, o.shipping_address_line2 AS shippingAddressLine2,
  o.shipping_city AS shippingCity, o.shipping_state AS shippingState, o.shipping_pincode AS shippingPincode,
  o.notes, o.created_at AS createdAt, o.updated_at AS updatedAt,
  o.requested_by AS requestedBy, u.name AS requestedByName, u.email AS requestedByEmail,
  -- Name and email are both NULL for a customer OTP login created and an admin then ordered for,
  -- so the phone travels along as the identifier that is always there.
  u.phone AS requestedByPhone
`;
const ORDER_JOINS = `FROM orders o JOIN users u ON u.id = o.requested_by`;

// orders.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  created_at: 'o.created_at',
  status: 'o.status',
  total_amount: 'o.total_amount',
};

// Order numbers are random, not sequential — per-business uniqueness is enforced by the
// composite key uq_orders_business_order_number (business_id, order_number). The retry loop
// in createOrder regenerates on a collision, so the same ORD-YYYYMMDD-XXXXX space is reused
// independently by every business.
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `ORD-${datePart}-${randomPart}`;
}

async function getOrderRow(businessId, id) {
  const [row] = await executeQuery(
    `SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} WHERE o.id = ? AND o.business_id = ?`,
    [id, businessId],
  );
  if (!row) throw new AppError(404, 'Order not found');
  return row;
}

export async function listOrders(businessId, listQuery, filters, requester) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['o.business_id = ?'];
  const params = [businessId];
  if (requester.role === 'customer' || filters.scope === 'own') {
    conditions.push('o.requested_by = ?');
    params.push(requester.sub);
  } else if (filters.customerId) {
    conditions.push('o.requested_by = ?');
    params.push(filters.customerId);
  }
  if (filters.status) {
    conditions.push('o.status = ?');
    params.push(filters.status);
  }
  if (filters.isBackorder !== undefined) {
    conditions.push('o.is_backorder = ?');
    params.push(filters.isBackorder);
  }
  if (filters.dateFrom) {
    conditions.push('o.created_at >= ?');
    params.push(filters.dateFrom);
  }
  // created_at is a UTC DATETIME — date_to is made inclusive by bounding below the next day.
  if (filters.dateTo) {
    conditions.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(filters.dateTo);
  }
  if (search) {
    conditions.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total ${ORDER_JOINS} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

/**
 * `requester` is optional — omit it for trusted internal lookups (e.g. right after the
 * same user's own `createOrder` call) that don't need the customer-ownership check.
 */
export async function getOrderById(businessId, id, requester) {
  const order = await getOrderRow(businessId, id);
  if (requester?.role === 'customer' && order.requestedBy !== requester.sub) {
    // 404, not 403 — a customer must not learn that another user's order id exists.
    throw new AppError(404, 'Order not found');
  }

  const items = await executeQuery(
    `SELECT oi.id, oi.product_id AS productId, oi.quantity,
            oi.price_at_order AS priceAtOrder, oi.discount_percent_at_order AS discountPercentAtOrder,
            oi.pieces_per_set_at_order AS piecesPerSetAtOrder,
            ROUND(oi.price_at_order * (1 - oi.discount_percent_at_order / 100), 2) AS effectivePriceAtOrder,
            p.name AS productName, p.product_code AS productCode, p.product_photo_url AS productPhotoUrl
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND oi.business_id = ?
     ORDER BY oi.id`,
    [id, businessId],
  );

  let duplicateTransactionCount = 0;
  if (requester?.role !== 'customer' && order.transactionId) {
    const [dupRow] = await executeQuery(
      `SELECT COUNT(*) AS count FROM orders WHERE transaction_id = ? AND id != ? AND business_id = ?`,
      [order.transactionId, id, businessId],
    );
    duplicateTransactionCount = dupRow.count;
  }

  return { ...order, items, duplicateTransactionCount };
}

export async function createOrder(businessId, input, userId) {
  // Manual order: admin/staff place the order on behalf of a customer — the order belongs to
  // that customer (requested_by) exactly as if they had placed it themselves. A user is global,
  // so no business filter here; the "requested for" user need not be a member of this business.
  const ownerId = input.requestedFor ?? userId;
  if (input.requestedFor) {
    const [owner] = await executeQuery(`SELECT id, is_active AS isActive FROM users WHERE id = ?`, [input.requestedFor]);
    if (!owner) throw new AppError(404, 'Selected customer not found');
    if (!owner.isActive) throw new AppError(409, 'Selected customer account is deactivated');
  }

  // Idempotency: a repeat submit with the same key (double-click, retry, back-button) returns
  // the order already created for it instead of creating a duplicate.
  const [existingByKey] = await executeQuery(
    `SELECT id FROM orders WHERE idempotency_key = ? AND requested_by = ? AND business_id = ?`,
    [input.idempotencyKey, ownerId, businessId],
  );
  if (existingByKey) return getOrderById(businessId, existingByKey.id);

  // Merge duplicate productId lines defensively, then lock rows in a consistent order so two
  // concurrent multi-item orders sharing products can't deadlock each other.
  const mergedQuantities = new Map();
  for (const item of input.items) {
    mergedQuantities.set(item.productId, (mergedQuantities.get(item.productId) ?? 0) + item.quantity);
  }
  const sortedItems = [...mergedQuantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  const orderId = crypto.randomUUID();

  let isBackorder = false;

  await withTransaction(async (execute) => {
    const failures = [];
    const validItems = [];

    // Placing an order does not reserve stock — it's only a soft availability check.
    // The quantity is actually locked and reserved when the order is accepted.
    for (const item of sortedItems) {
      const [product] = await execute(
        `SELECT id, name, price, discount_percent AS discountPercent, pieces_per_set AS piecesPerSet,
                quantity_available AS quantityAvailable, is_active AS isActive
         FROM products WHERE id = ? AND business_id = ?`,
        [item.productId, businessId],
      );
      if (!product) {
        // Nonexistent/inactive products hard-fail regardless of allowBackorder — that flag is
        // about quantity shortfalls only, never about ordering something that isn't sellable.
        // A productId that belongs to another business also lands here.
        failures.push(`One of the selected products no longer exists`);
      } else if (!product.isActive) {
        failures.push(`${product.name} is no longer available`);
      } else if (product.quantityAvailable < item.quantity) {
        if (input.allowBackorder) {
          isBackorder = true;
          validItems.push({ ...item, product });
        } else {
          failures.push(`${product.name} — only ${product.quantityAvailable} left in stock`);
        }
      } else {
        validItems.push({ ...item, product });
      }
    }

    // All-or-nothing: report every failing line in one response instead of one at a time.
    if (failures.length > 0) throw new AppError(409, failures.join('; '));

    // product.price is always per-piece; quantity counts sets (1 set = product.piecesPerSet
    // pieces) — a line's money total must scale by both.
    const totalAmount = validItems.reduce(
      (sum, { quantity, product }) =>
        sum + effectivePrice(product.price, product.discountPercent) * product.piecesPerSet * quantity,
      0,
    );

    // The order row must exist before order_items can point their order_id FK at it.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const orderNumber = generateOrderNumber();
      try {
        await execute(
          `INSERT INTO orders (
             id, business_id, order_number, requested_by, status, is_backorder, payment_method, transaction_id, payment_status,
             total_amount, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2,
             shipping_city, shipping_state, shipping_pincode, idempotency_key, notes
           ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            businessId,
            orderNumber,
            ownerId,
            isBackorder,
            input.paymentMethod ?? 'bank_transfer',
            input.transactionId ?? null,
            totalAmount.toFixed(2),
            input.shippingName,
            input.shippingPhone,
            input.shippingAddressLine1,
            input.shippingAddressLine2 || null,
            input.shippingCity,
            input.shippingState,
            input.shippingPincode,
            input.idempotencyKey,
            input.notes || null,
          ],
        );
        break;
      } catch (err) {
        const sqlMessage = String(err.sqlMessage ?? '');
        if (err.code === 'ER_DUP_ENTRY' && sqlMessage.includes('idempotency_key')) {
          throw new AppError(409, 'This order was already submitted');
        }
        if (err.code === 'ER_DUP_ENTRY' && sqlMessage.includes('order_number') && attempt < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    for (const { productId, quantity, product } of validItems) {
      await execute(
        `INSERT INTO order_items (id, business_id, order_id, product_id, quantity, price_at_order, discount_percent_at_order, pieces_per_set_at_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          businessId,
          orderId,
          productId,
          quantity,
          product.price,
          product.discountPercent,
          product.piecesPerSet,
        ],
      );
    }
  });

  return getOrderById(businessId, orderId);
}

// Order lifecycle: pending -> accepted -> dispatched -> completed, with rejected/cancelled
// as terminal exits from pending. The accepted -> dispatched transition is NOT allowed here:
// it only happens inside the dispatches module (POST /dispatches), which flips the status
// in the same transaction that releases the reserved quantity.
const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  dispatched: ['completed'],
};

export async function updateOrderStatus(businessId, id, status, requester) {
  const order = await getOrderRow(businessId, id);

  if (requester.role === 'customer') {
    if (order.requestedBy !== requester.sub) throw new AppError(404, 'Order not found');
    if (status !== 'cancelled') throw new AppError(403, 'You can only cancel your own order');
  }
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
    throw new AppError(409, `Order is ${order.status} and cannot be changed to ${status}`);
  }
  // A rejected payment can't fund a fulfilled order — block acceptance (and therefore the
  // downstream dispatch, which requires 'accepted') until the payment status is reconsidered.
  if (status === 'accepted' && order.paymentStatus === 'rejected') {
    throw new AppError(409, 'Payment for this order was rejected — it cannot be accepted');
  }

  if (status === 'completed') {
    await executeQuery(`UPDATE orders SET status = ? WHERE id = ? AND business_id = ?`, [status, id, businessId]);
    return getOrderById(businessId, id, requester);
  }

  if (status === 'accepted') {
    const items = await executeQuery(
      `SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ? AND business_id = ?`,
      [id, businessId],
    );
    // Lock rows in a consistent order so two concurrent acceptances sharing products can't deadlock.
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));

    // Stock is only committed at acceptance — this is the moment the reserved quantity
    // is actually claimed against this order. Product rows are still locked in a
    // consistent order (sortedItems) so two concurrent acceptances sharing products
    // can't deadlock each other.
    await withTransaction(async (execute) => {
      // Re-check under lock so two concurrent accept requests (double-click, two staff tabs,
      // a client retry) can't both pass the pre-transaction "is this pending?" check and then
      // both reserve stock for the same order. Locked (and unlocked, below) in that order —
      // order row first, then product rows — to match dispatches.service.js's lock ordering
      // (order row, then product rows via UPDATE) and avoid a cross-path deadlock.
      const [lockedOrder] = await execute(`SELECT status FROM orders WHERE id = ? AND business_id = ? FOR UPDATE`, [
        id,
        businessId,
      ]);
      if (lockedOrder.status !== 'pending') {
        throw new AppError(409, `Order is ${lockedOrder.status} and cannot be changed to accepted`);
      }

      const failures = [];
      const lockedItems = [];

      for (const item of sortedItems) {
        const [product] = await execute(
          `SELECT id, name, quantity_available AS quantityAvailable FROM products WHERE id = ? AND business_id = ? FOR UPDATE`,
          [item.productId, businessId],
        );
        if (!product || product.quantityAvailable < item.quantity) {
          failures.push(`${product?.name ?? 'A product'} — only ${product?.quantityAvailable ?? 0} left in stock`);
          continue;
        }
        lockedItems.push(item);
      }

      // All-or-nothing: report every failing line in one response instead of one at a time.
      if (failures.length > 0) throw new AppError(409, failures.join('; '));

      for (const { productId, quantity } of lockedItems) {
        await execute(
          `UPDATE products SET quantity_available = quantity_available - ?, quantity_reserved = quantity_reserved + ?
           WHERE id = ? AND business_id = ?`,
          [quantity, quantity, productId, businessId],
        );
        await execute(
          `INSERT INTO stock_ledger (business_id, product_id, change_type, quantity, reference_type, reference_id, note)
           VALUES (?, ?, 'out', ?, 'order', ?, 'Stock reserved for order')`,
          [businessId, productId, quantity, id],
        );
      }

      // Defense in depth: the row lock above should already rule out a concurrent transition,
      // but guard the UPDATE itself too and check the affected-row count in case an isolation
      // level quirk let the lock through — if 0 rows changed, someone else already moved this
      // order out of 'pending' between the lock and here.
      const updateResult = await execute(
        `UPDATE orders SET status = 'accepted' WHERE id = ? AND business_id = ? AND status = 'pending'`,
        [id, businessId],
      );
      if (updateResult.affectedRows === 0) {
        throw new AppError(409, `Order is no longer pending and cannot be changed to accepted`);
      }
    });

    return getOrderById(businessId, id, requester);
  }

  // rejected / cancelled — always from pending, before any stock has been reserved, so there's
  // nothing to release.
  await executeQuery(`UPDATE orders SET status = ? WHERE id = ? AND business_id = ?`, [status, id, businessId]);
  return getOrderById(businessId, id, requester);
}

export async function updatePaymentStatus(businessId, id, paymentStatus, requester) {
  await getOrderRow(businessId, id); // 404s if it doesn't exist in this business
  await executeQuery(`UPDATE orders SET payment_status = ? WHERE id = ? AND business_id = ?`, [
    paymentStatus,
    id,
    businessId,
  ]);
  return getOrderById(businessId, id, requester);
}
