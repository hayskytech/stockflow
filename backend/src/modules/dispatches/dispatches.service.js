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

// Dispatch numbers are random, not sequential — per-business uniqueness is enforced by the
// composite key uq_dispatches_business_dispatch_number (business_id, dispatch_number). The
// retry loop in createDispatch regenerates on a collision, so every business reuses the same
// DSP-YYYYMMDD-XXXXX space independently.
function generateDispatchNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
  return `DSP-${datePart}-${randomPart}`;
}

export async function listDispatches(businessId, listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['d.business_id = ?'];
  const params = [businessId];
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
  const where = `WHERE ${conditions.join(' AND ')}`;
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

export async function getDispatchById(businessId, id) {
  const [dispatch] = await executeQuery(
    `SELECT ${DISPATCH_COLUMNS} ${DISPATCH_JOINS} WHERE d.id = ? AND d.business_id = ?`,
    [id, businessId],
  );
  if (!dispatch) throw new AppError(404, 'Dispatch not found');

  const items = await executeQuery(
    `SELECT oi.id, oi.product_id AS productId, oi.quantity,
            p.name AS productName, p.product_code AS productCode
     FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND oi.business_id = ?
     ORDER BY p.name`,
    [dispatch.orderId, businessId],
  );

  return { ...dispatch, items };
}

async function getAcceptedOrder(businessId, orderId) {
  const [order] = await executeQuery(
    `SELECT id, order_number AS orderNumber, status FROM orders WHERE id = ? AND business_id = ?`,
    [orderId, businessId],
  );
  if (!order) throw new AppError(404, 'Order not found');
  return order;
}

async function getOrderedQuantities(businessId, orderId) {
  const items = await executeQuery(
    `SELECT oi.product_id AS productId, oi.quantity, p.name AS productName
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? AND oi.business_id = ?`,
    [orderId, businessId],
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
 * Every lookup, guard and insert is scoped to `businessId` — a cross-tenant orderId 404s.
 */
export async function createDispatch(businessId, { orderId, courierName, awbNumber, note }, userId) {
  const order = await getAcceptedOrder(businessId, orderId);
  if (order.status !== 'accepted') {
    throw new AppError(409, `Order is ${order.status} — only accepted orders can be dispatched`);
  }
  const orderedByProduct = await getOrderedQuantities(businessId, orderId);

  const dispatchId = crypto.randomUUID();

  await withTransaction(async (execute) => {
    // Re-check under lock so two concurrent dispatch attempts can't both proceed.
    const [lockedOrder] = await execute(`SELECT status FROM orders WHERE id = ? AND business_id = ? FOR UPDATE`, [
      orderId,
      businessId,
    ]);
    if (lockedOrder.status !== 'accepted') {
      throw new AppError(409, `Order is ${lockedOrder.status} — only accepted orders can be dispatched`);
    }

    // The dispatch row must exist before it can be referenced by dispatch_number retries below.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await execute(
          `INSERT INTO dispatches (id, business_id, dispatch_number, order_id, dispatched_by, courier_name, awb_number, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dispatchId,
            businessId,
            generateDispatchNumber(),
            orderId,
            userId,
            courierName ?? null,
            awbNumber ?? null,
            note ?? null,
          ],
        );
        break;
      } catch (err) {
        if (
          err.code === 'ER_DUP_ENTRY' &&
          String(err.sqlMessage ?? '').includes('dispatch_number') &&
          attempt < maxAttempts
        ) {
          continue;
        }
        throw err;
      }
    }

    for (const [productId, { quantity }] of orderedByProduct) {
      await execute(`UPDATE products SET quantity_reserved = quantity_reserved - ? WHERE id = ? AND business_id = ?`, [
        quantity,
        productId,
        businessId,
      ]);
      await execute(
        `INSERT INTO stock_ledger (business_id, product_id, change_type, quantity, reference_type, reference_id, note)
         VALUES (?, ?, 'out', ?, 'dispatch', ?, ?)`,
        [businessId, productId, quantity, dispatchId, `Dispatched against order ${order.orderNumber}`],
      );
    }

    await execute(`UPDATE orders SET status = 'dispatched' WHERE id = ? AND business_id = ?`, [orderId, businessId]);
  });

  return getDispatchById(businessId, dispatchId);
}
