import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';
import { parseRowsFromFile } from '../../utils/importFile.js';

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
  if (filters.dateTo) {
    conditions.push('d.created_at <= ?');
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
      `SELECT ${DISPATCH_COLUMNS}, (SELECT COUNT(*) FROM dispatch_items di WHERE di.dispatch_id = d.id) AS unitCount
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
    `SELECT di.id, di.stock_id AS stockId, di.barcode, di.product_id AS productId,
            p.name AS productName, p.product_code AS productCode
     FROM dispatch_items di JOIN products p ON p.id = di.product_id
     WHERE di.dispatch_id = ?
     ORDER BY p.name, di.barcode`,
    [id],
  );

  return { ...dispatch, items };
}

/**
 * Classifies scanned barcodes against an order's reserved units. `stockRows` are the stock
 * rows found for the scanned barcodes; `orderedByProduct` maps productId → ordered quantity.
 * Returns one entry per input barcode:
 *   matched        — reserved for this order (the expected unit)
 *   swap           — in_stock unit of an ordered product (will replace a reserved unit)
 *   wrong_product  — exists, but its product is not on this order
 *   unavailable    — reserved for another order or already dispatched
 *   unknown        — barcode not in stock at all
 */
function classifyBarcodes(barcodes, stockRows, orderId, orderedByProduct) {
  const byBarcode = new Map(stockRows.map((row) => [row.barcode, row]));
  return barcodes.map((barcode) => {
    const row = byBarcode.get(barcode);
    if (!row) return { barcode, status: 'unknown' };
    const base = { barcode, productId: row.productId, productName: row.productName };
    if (!orderedByProduct.has(row.productId)) return { ...base, status: 'wrong_product' };
    if (row.status === 'reserved' && row.orderId === orderId) return { ...base, status: 'matched' };
    if (row.status === 'in_stock') return { ...base, status: 'swap' };
    return { ...base, status: 'unavailable', unitStatus: row.status };
  });
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

/** Advisory per-barcode check while scanning against an order — never locks or mutates. */
export async function checkBarcodesForOrder(orderId, barcodes) {
  const order = await getAcceptedOrder(orderId);
  if (order.status !== 'accepted') {
    throw new AppError(409, `Order is ${order.status} — only accepted orders can be dispatched`);
  }
  const orderedByProduct = await getOrderedQuantities(orderId);

  const stockRows = await executeQuery(
    `SELECT s.barcode, s.status, s.order_id AS orderId, s.product_id AS productId, p.name AS productName
     FROM stock s JOIN products p ON p.id = s.product_id
     WHERE s.barcode IN (${barcodes.map(() => '?').join(',')})`,
    barcodes,
  );

  return classifyBarcodes(barcodes, stockRows, orderId, orderedByProduct);
}

/**
 * Scan-verified dispatch of an accepted order — all-or-nothing. Every scanned barcode must be
 * either the unit reserved for this order or an in_stock unit of the same product (a swap:
 * staff pulled a different physical piece than the one auto-reserved at order time — the
 * reserved unit is released back to stock and the scanned one goes out instead). Scanned
 * counts must exactly match ordered quantities per product. On success the order becomes
 * `dispatched` in the same transaction. Problems are reported all at once in the 409 details.
 */
export async function createDispatch({ orderId, barcodes, courierName, awbNumber, note }, userId) {
  const batchDuplicates = [...new Set(barcodes.filter((barcode, index) => barcodes.indexOf(barcode) !== index))];
  if (batchDuplicates.length > 0) {
    throw new AppError(400, `These barcodes appear more than once in the batch: ${batchDuplicates.join(', ')}`, batchDuplicates);
  }

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

    const stockRows = await execute(
      `SELECT s.id, s.barcode, s.status, s.order_id AS orderId, s.product_id AS productId, p.name AS productName
       FROM stock s JOIN products p ON p.id = s.product_id
       WHERE s.barcode IN (${barcodes.map(() => '?').join(',')}) FOR UPDATE`,
      barcodes,
    );
    const classified = classifyBarcodes(barcodes, stockRows, orderId, orderedByProduct);

    const problems = [];
    for (const entry of classified) {
      if (entry.status === 'unknown') problems.push(`Barcode ${entry.barcode} is not in stock`);
      else if (entry.status === 'wrong_product') problems.push(`Barcode ${entry.barcode} (${entry.productName}) is not on this order`);
      else if (entry.status === 'unavailable') problems.push(`Barcode ${entry.barcode} is already ${entry.unitStatus === 'dispatched' ? 'dispatched' : 'reserved for another order'}`);
    }

    // Per-product scanned counts must exactly match ordered quantities.
    const scannedByProduct = new Map();
    for (const entry of classified) {
      if (entry.status !== 'matched' && entry.status !== 'swap') continue;
      scannedByProduct.set(entry.productId, (scannedByProduct.get(entry.productId) ?? 0) + 1);
    }
    for (const [productId, { productName, quantity }] of orderedByProduct) {
      const scannedCount = scannedByProduct.get(productId) ?? 0;
      if (scannedCount !== quantity) {
        problems.push(`${productName} — scanned ${scannedCount} of ${quantity} ordered`);
      }
    }

    if (problems.length > 0) throw new AppError(409, problems.join('; '), problems);

    const byBarcode = new Map(stockRows.map((row) => [row.barcode, row]));
    const scannedIds = classified.map((entry) => byBarcode.get(entry.barcode).id);
    const swapCount = classified.filter((entry) => entry.status === 'swap').length;

    // Swap: reserved units the staff did NOT physically pull go back to open stock; the
    // scanned replacements leave instead. Available quantity nets to zero per product since
    // scanned counts match ordered counts exactly.
    const reservedRows = await execute(
      `SELECT id, product_id AS productId FROM stock WHERE order_id = ? AND status = 'reserved' FOR UPDATE`,
      [orderId],
    );
    const scannedIdSet = new Set(scannedIds);
    const toRelease = reservedRows.filter((row) => !scannedIdSet.has(row.id));

    if (toRelease.length > 0) {
      await execute(
        `UPDATE stock SET status = 'in_stock', order_id = NULL WHERE id IN (${toRelease.map(() => '?').join(',')})`,
        toRelease.map((row) => row.id),
      );
    }
    await execute(
      `UPDATE stock SET status = 'dispatched', order_id = ? WHERE id IN (${scannedIds.map(() => '?').join(',')})`,
      [orderId, ...scannedIds],
    );

    // The dispatch row must exist before dispatch_items can point at it.
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

    for (const entry of classified) {
      const unit = byBarcode.get(entry.barcode);
      await execute(
        `INSERT INTO dispatch_items (id, dispatch_id, stock_id, product_id, barcode)
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), dispatchId, unit.id, unit.productId, unit.barcode],
      );
    }

    for (const [productId, { quantity }] of orderedByProduct) {
      await execute(`UPDATE products SET quantity_reserved = quantity_reserved - ? WHERE id = ?`, [quantity, productId]);
      await execute(
        `INSERT INTO stock_ledger (product_id, change_type, quantity, reference_type, reference_id, note)
         VALUES (?, 'out', ?, 'dispatch', ?, ?)`,
        [productId, quantity, dispatchId, `Dispatched against order ${order.orderNumber}${swapCount > 0 ? ` (${swapCount} unit(s) swapped)` : ''}`],
      );
    }

    await execute(`UPDATE orders SET status = 'dispatched' WHERE id = ?`, [orderId]);
  });

  return getDispatchById(dispatchId);
}

/**
 * Dispatch via uploaded .xlsx/.csv instead of live scanning — the file needs a `Barcode`
 * column; all other columns are ignored. Same all-or-nothing rules as createDispatch.
 */
export async function importDispatch(fields, buffer, originalName, userId) {
  const rawRows = await parseRowsFromFile(buffer, originalName);

  const barcodes = [];
  const errors = [];
  for (const { rowNumber, data } of rawRows) {
    const barcode = String(data.Barcode ?? '').trim();
    if (!barcode) {
      errors.push(`Row ${rowNumber}: Barcode is empty`);
      continue;
    }
    if (barcode.length > 50) {
      errors.push(`Row ${rowNumber}: barcode is longer than 50 characters`);
      continue;
    }
    barcodes.push(barcode);
  }
  if (errors.length > 0) {
    throw new AppError(400, `Import rejected — fix these rows and re-upload: ${errors.join('; ')}`);
  }
  if (barcodes.length === 0) {
    throw new AppError(400, 'File has no Barcode values — the first row must be a header containing a "Barcode" column');
  }

  return createDispatch({ ...fields, barcodes }, userId);
}
