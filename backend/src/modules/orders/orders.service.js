import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const ORDER_COLUMNS = `
  o.id, o.order_number AS orderNumber, o.status,
  o.payment_method AS paymentMethod, o.transaction_id AS transactionId, o.payment_status AS paymentStatus,
  o.total_amount AS totalAmount,
  o.shipping_name AS shippingName, o.shipping_phone AS shippingPhone,
  o.shipping_address_line1 AS shippingAddressLine1, o.shipping_address_line2 AS shippingAddressLine2,
  o.shipping_city AS shippingCity, o.shipping_state AS shippingState, o.shipping_pincode AS shippingPincode,
  o.notes, o.created_at AS createdAt, o.updated_at AS updatedAt,
  o.requested_by AS requestedBy, u.name AS requestedByName, u.email AS requestedByEmail
`;
const ORDER_JOINS = `FROM orders o JOIN users u ON u.id = o.requested_by`;

// orders.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  created_at: 'o.created_at',
  status: 'o.status',
  total_amount: 'o.total_amount',
};

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `ORD-${datePart}-${randomPart}`;
}

async function getOrderRow(id) {
  const [row] = await executeQuery(`SELECT ${ORDER_COLUMNS} ${ORDER_JOINS} WHERE o.id = ?`, [id]);
  if (!row) throw new AppError(404, 'Order not found');
  return row;
}

export async function listOrders(listQuery, filters, requester) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (requester.role === 'customer' || filters.scope === 'own') {
    conditions.push('o.requested_by = ?');
    params.push(requester.sub);
  }
  if (filters.status) {
    conditions.push('o.status = ?');
    params.push(filters.status);
  }
  if (filters.dateFrom) {
    conditions.push('o.created_at >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('o.created_at <= ?');
    params.push(filters.dateTo);
  }
  if (search) {
    conditions.push('(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
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
export async function getOrderById(id, requester) {
  const order = await getOrderRow(id);
  if (requester?.role === 'customer' && order.requestedBy !== requester.sub) {
    // 404, not 403 — a customer must not learn that another user's order id exists.
    throw new AppError(404, 'Order not found');
  }

  const items = await executeQuery(
    `SELECT oi.id, oi.product_id AS productId, oi.quantity,
            oi.mrp_at_order AS mrpAtOrder, oi.wsp_at_order AS wspAtOrder,
            p.name AS productName, p.product_code AS productCode, p.product_photo_url AS productPhotoUrl
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [id],
  );

  let duplicateTransactionCount = 0;
  if (requester?.role !== 'customer' && order.transactionId) {
    const [dupRow] = await executeQuery(`SELECT COUNT(*) AS count FROM orders WHERE transaction_id = ? AND id != ?`, [
      order.transactionId,
      id,
    ]);
    duplicateTransactionCount = dupRow.count;
  }

  return { ...order, items, duplicateTransactionCount };
}

export async function createOrder(input, userId) {
  // Manual order: admin/staff place the order on behalf of a customer — the order belongs to
  // that customer (requested_by) exactly as if they had placed it themselves.
  const ownerId = input.requestedFor ?? userId;
  if (input.requestedFor) {
    const [owner] = await executeQuery(`SELECT id, is_active AS isActive FROM users WHERE id = ?`, [input.requestedFor]);
    if (!owner) throw new AppError(404, 'Selected customer not found');
    if (!owner.isActive) throw new AppError(409, 'Selected customer account is deactivated');
  }

  // Idempotency: a repeat submit with the same key (double-click, retry, back-button) returns
  // the order already created for it instead of creating a duplicate.
  const [existingByKey] = await executeQuery(`SELECT id FROM orders WHERE idempotency_key = ? AND requested_by = ?`, [
    input.idempotencyKey,
    ownerId,
  ]);
  if (existingByKey) return getOrderById(existingByKey.id);

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

  await withTransaction(async (execute) => {
    const failures = [];
    const validItems = [];

    // Placing an order does not reserve stock — it's only a soft availability check.
    // Specific barcoded units get locked and reserved when the order is accepted.
    for (const item of sortedItems) {
      const [product] = await execute(
        `SELECT id, name, mrp, wsp, quantity_available AS quantityAvailable, is_active AS isActive
         FROM products WHERE id = ?`,
        [item.productId],
      );
      if (!product) {
        failures.push(`One of the selected products no longer exists`);
      } else if (!product.isActive) {
        failures.push(`${product.name} is no longer available`);
      } else if (product.quantityAvailable < item.quantity) {
        failures.push(`${product.name} — only ${product.quantityAvailable} left in stock`);
      } else {
        validItems.push({ ...item, product });
      }
    }

    // All-or-nothing: report every failing line in one response instead of one at a time.
    if (failures.length > 0) throw new AppError(409, failures.join('; '));

    const totalAmount = validItems.reduce((sum, { quantity, product }) => sum + Number(product.wsp) * quantity, 0);

    // The order row must exist before order_items can point their order_id FK at it.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const orderNumber = generateOrderNumber();
      try {
        await execute(
          `INSERT INTO orders (
             id, order_number, requested_by, status, payment_method, transaction_id, payment_status,
             total_amount, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2,
             shipping_city, shipping_state, shipping_pincode, idempotency_key, notes
           ) VALUES (?, ?, ?, 'pending', ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            orderNumber,
            ownerId,
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
        `INSERT INTO order_items (id, order_id, product_id, quantity, mrp_at_order, wsp_at_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), orderId, productId, quantity, product.mrp, product.wsp],
      );
    }
  });

  return getOrderById(orderId);
}

// Order lifecycle: pending -> accepted -> dispatched -> completed, with rejected/cancelled
// as terminal exits from pending. The accepted -> dispatched transition is NOT allowed here:
// it only happens inside the dispatches module (POST /dispatches), which scan-verifies the
// physical units before flipping the status in the same transaction.
const ALLOWED_TRANSITIONS = {
  pending: ['accepted', 'rejected', 'cancelled'],
  dispatched: ['completed'],
};

export async function updateOrderStatus(id, status, requester) {
  const order = await getOrderRow(id);

  if (requester.role === 'customer') {
    if (order.requestedBy !== requester.sub) throw new AppError(404, 'Order not found');
    if (status !== 'cancelled') throw new AppError(403, 'You can only cancel your own order');
  }
  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
    throw new AppError(409, `Order is ${order.status} and cannot be changed to ${status}`);
  }

  if (status === 'completed') {
    await executeQuery(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
    return getOrderById(id, requester);
  }

  if (status === 'accepted') {
    const items = await executeQuery(`SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ?`, [
      id,
    ]);
    // Lock rows in a consistent order so two concurrent acceptances sharing products can't deadlock.
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));

    // Stock is only committed at acceptance — this is the moment the reserved quantity/units
    // are actually claimed against this order.
    await withTransaction(async (execute) => {
      const failures = [];
      const lockedItems = [];

      for (const item of sortedItems) {
        const [product] = await execute(
          `SELECT id, name, quantity_available AS quantityAvailable FROM products WHERE id = ? FOR UPDATE`,
          [item.productId],
        );
        if (!product || product.quantityAvailable < item.quantity) {
          failures.push(`${product?.name ?? 'A product'} — only ${product?.quantityAvailable ?? 0} left in stock`);
          continue;
        }
        // Picks the actual barcoded units being reserved — oldest invoice first — and locks
        // them so two concurrent acceptances can't claim the same unit.
        const stockRows = await execute(
          `SELECT id FROM stock WHERE product_id = ? AND status = 'in_stock'
           ORDER BY invoice_date ASC, created_at ASC LIMIT ? FOR UPDATE`,
          [item.productId, item.quantity],
        );
        if (stockRows.length < item.quantity) {
          failures.push(`${product.name} — only ${stockRows.length} left in stock`);
        } else {
          lockedItems.push({ ...item, stockIds: stockRows.map((row) => row.id) });
        }
      }

      // All-or-nothing: report every failing line in one response instead of one at a time.
      if (failures.length > 0) throw new AppError(409, failures.join('; '));

      for (const { productId, quantity, stockIds } of lockedItems) {
        await execute(
          `UPDATE products SET quantity_available = quantity_available - ?, quantity_reserved = quantity_reserved + ?
           WHERE id = ?`,
          [quantity, quantity, productId],
        );
        await execute(
          `UPDATE stock SET status = 'reserved', order_id = ? WHERE id IN (${stockIds.map(() => '?').join(',')})`,
          [id, ...stockIds],
        );
        await execute(
          `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
           VALUES (?, 'out', ?, 'order', ?, 'Stock reserved for order')`,
          [productId, quantity, id],
        );
      }

      await execute(`UPDATE orders SET status = 'accepted' WHERE id = ?`, [id]);
    });

    return getOrderById(id, requester);
  }

  // rejected / cancelled — always from pending, before any stock has been reserved, so there's
  // nothing to release.
  await executeQuery(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
  return getOrderById(id, requester);
}

export async function updatePaymentStatus(id, paymentStatus, requester) {
  await getOrderRow(id); // 404s if it doesn't exist
  await executeQuery(`UPDATE orders SET payment_status = ? WHERE id = ?`, [paymentStatus, id]);
  return getOrderById(id, requester);
}
