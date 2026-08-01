import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const DISPATCH_COLUMNS = `
  d.id, d.dispatch_number AS dispatchNumber, d.order_id AS orderId, d.courier_name AS courierName,
  d.awb_number AS awbNumber, d.note, d.created_at AS createdAt,
  d.dispatched_by AS dispatchedBy, u.name AS dispatchedByName,
  o.order_number AS orderNumber, o.shipping_name AS shippingName
`;
const DISPATCH_JOINS = `FROM dispatches d JOIN users u ON u.id = d.dispatched_by JOIN orders o ON o.id = d.order_id`;

// dispatches.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  created_at: 'd.created_at',
  dispatch_number: 'd.dispatch_number',
};

function generateDispatchNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `DSP-${datePart}-${randomPart}`;
}

export async function listDispatches(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (filters.orderId) {
    conditions.push('d.order_id = ?');
    params.push(filters.orderId);
  }
  if (filters.dateFrom) {
    conditions.push('d.created_at >= ?');
    params.push(filters.dateFrom);
  }
  // created_at is a UTC DATETIME — date_to is made inclusive by bounding below the next day.
  if (filters.dateTo) {
    conditions.push('d.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(filters.dateTo);
  }
  if (search) {
    conditions.push('(d.dispatch_number LIKE ? OR o.order_number LIKE ? OR d.awb_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${DISPATCH_COLUMNS}, (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = d.order_id) AS unitCount
       ${DISPATCH_JOINS} ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total ${DISPATCH_JOINS} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getDispatchById(id) {
  const [dispatch] = await executeQuery(`SELECT ${DISPATCH_COLUMNS} ${DISPATCH_JOINS} WHERE d.id = ?`, [id]);
  if (!dispatch) throw new AppError(404, 'Dispatch not found');

  const items = await executeQuery(
    `SELECT oi.id, oi.product_id AS productId, oi.quantity,
            p.name AS productName, p.product_code AS productCode
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY p.name`,
    [dispatch.orderId],
  );

  return { ...dispatch, items };
}

async function getAcceptedOrder(orderId) {
  const [order] = await executeQuery(`SELECT id, order_number AS orderNumber, status FROM orders WHERE id = ?`, [orderId]);
  if (!order) throw new AppError(404, 'Order not found');
  return order;
}

async function getOrderedQuantities(orderId) {
  const items = await executeQuery(
    `SELECT oi.product_id AS productId, oi.quantity, p.name AS productName
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
    [orderId],
  );
  const orderedByProduct = new Map();
  for (const item of items) {
    orderedByProduct.set(item.productId, {
      productName: item.productName,
      quantity: (orderedByProduct.get(item.productId)?.quantity ?? 0) + item.quantity,
    });
  }
  return orderedByProduct;
}

/**
 * Dispatch of an accepted order — full-order, one-per-order. Releases the order's reserved
 * quantity and flips it to `dispatched` in the same transaction the dispatch row is created in.
 */
export async function createDispatch({ orderId, courierName, awbNumber, note }, userId) {
  const order = await getAcceptedOrder(orderId);
  if (order.status !== 'accepted') {
    throw new AppError(409, `Order is ${order.status} — only accepted orders can be dispatched`);
  }
  const orderedByProduct = await getOrderedQuantities(orderId);

  const dispatchId = crypto.randomUUID();

  await withTransaction(async (execute) => {
    // Re-check under lock so two concurrent dispatch attempts can't both proceed.
    const [lockedOrder] = await execute(`SELECT status FROM orders WHERE id = ? FOR UPDATE`, [orderId]);
    if (lockedOrder.status !== 'accepted') {
      throw new AppError(409, `Order is ${lockedOrder.status} — only accepted orders can be dispatched`);
    }

    // The dispatch row must exist before it can be referenced by dispatch_number retries below.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await execute(
          `INSERT INTO dispatches (id, dispatch_number, order_id, dispatched_by, courier_name, awb_number, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [dispatchId, generateDispatchNumber(), orderId, userId, courierName ?? null, awbNumber ?? null, note ?? null],
        );
        break;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' && String(err.sqlMessage ?? '').includes('dispatch_number') && attempt < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    for (const [productId, { quantity }] of orderedByProduct) {
      await execute(`UPDATE products SET quantity_reserved = quantity_reserved - ? WHERE id = ?`, [quantity, productId]);
      await execute(
        `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
         VALUES (?, 'out', ?, 'dispatch', ?, ?)`,
        [productId, quantity, dispatchId, `Dispatched against order ${order.orderNumber}`],
      );
    }

    await execute(`UPDATE orders SET status = 'dispatched' WHERE id = ?`, [orderId]);
  });

  return getDispatchById(dispatchId);
}
