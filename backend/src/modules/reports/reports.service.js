import { executeQuery } from '../../db/query.js';

const ORDER_STATUSES = ['pending', 'accepted', 'rejected', 'dispatched', 'completed', 'cancelled'];

/** Formats a Date as a naive YYYY-MM-DD string, matching mysql2's `dateStrings: true` output. */
function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export async function getStockSummary() {
  const [totals] = await executeQuery(
    `SELECT
       COUNT(*) AS totalProducts,
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeProducts,
       COALESCE(SUM(quantity_available), 0) AS totalQuantityAvailable,
       SUM(CASE WHEN quantity_available <= reorder_level THEN 1 ELSE 0 END) AS lowStockCount
     FROM products`,
  );

  const lowStockItems = await executeQuery(
    `SELECT p.id, p.name, p.product_code AS productCode, p.quantity_available AS quantityAvailable,
            p.reorder_level AS reorderLevel, c.name AS categoryName
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.is_active = 1 AND p.quantity_available <= p.reorder_level
     ORDER BY (p.quantity_available - p.reorder_level) ASC
     LIMIT 10`,
  );

  const byDivisionRows = await executeQuery(
    `SELECT d.name AS divisionName, COUNT(p.id) AS productCount,
            COALESCE(SUM(p.quantity_available), 0) AS totalQuantityAvailable
     FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN divisions d ON d.id = c.division_id
     WHERE p.is_active = 1
     GROUP BY d.id, d.name
     ORDER BY d.name`,
  );
  // mysql2 returns SUM()/aggregate-of-CASE results as strings (BIGINT-safe) — cast for correct
  // numeric use in the frontend (chart scales, arithmetic), matching totalOrderValue below.
  const byDivision = byDivisionRows.map((row) => ({
    ...row,
    totalQuantityAvailable: Number(row.totalQuantityAvailable),
  }));

  return {
    totalProducts: Number(totals.totalProducts),
    activeProducts: Number(totals.activeProducts),
    totalQuantityAvailable: Number(totals.totalQuantityAvailable),
    lowStockCount: Number(totals.lowStockCount),
    lowStockItems,
    byDivision,
  };
}

/**
 * Physical warehouse movement — how much stock came in and went out per day. Counts only
 * ledger rows that represent units physically entering/leaving ('import', 'adjustment',
 * 'dispatch'); order reserve/release rows are reservation bookkeeping, not movement.
 */
export async function getStockMovement(days) {
  const [onHand] = await executeQuery(
    `SELECT COALESCE(SUM(quantity_available), 0) AS availableUnits,
            COALESCE(SUM(quantity_reserved), 0)  AS reservedUnits
     FROM products`,
  );

  const dailyRows = await executeQuery(
    `SELECT DATE(created_at) AS date,
            COALESCE(SUM(CASE WHEN change_type = 'in' THEN quantity ELSE 0 END), 0) AS inQty,
            COALESCE(SUM(CASE WHEN change_type = 'out' THEN quantity ELSE 0 END), 0) AS outQty
     FROM stock_ledger
     WHERE reference_type IN ('import', 'adjustment', 'dispatch')
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [days - 1],
  );
  const dailyByDate = new Map(dailyRows.map((row) => [row.date, row]));

  // Fills in zero-movement days so the trend shows a continuous series, not just active days.
  const dailyMovement = [];
  let totalIn = 0;
  let totalOut = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const existing = dailyByDate.get(toDateOnly(date));
    const inQty = Number(existing?.inQty ?? 0);
    const outQty = Number(existing?.outQty ?? 0);
    totalIn += inQty;
    totalOut += outQty;
    dailyMovement.push({ date: toDateOnly(date), inQty, outQty });
  }

  return {
    availableUnits: Number(onHand.availableUnits),
    reservedUnits: Number(onHand.reservedUnits),
    totalIn,
    totalOut,
    dailyMovement,
  };
}

export async function getOrderHistory(days) {
  const [totals] = await executeQuery(`SELECT COUNT(*) AS totalOrders FROM orders`);

  const statusRows = await executeQuery(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status`);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }

  const [dispatchedToday] = await executeQuery(
    `SELECT COUNT(*) AS count FROM orders WHERE status = 'dispatched' AND DATE(updated_at) = CURDATE()`,
  );

  // "Order value" excludes rejected/cancelled orders — those never reserved real payment intent.
  const [valueRow] = await executeQuery(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalOrderValue FROM orders WHERE status NOT IN ('rejected', 'cancelled')`,
  );

  const dailyRows = await executeQuery(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue
     FROM orders
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [days - 1],
  );
  const dailyByDate = new Map(dailyRows.map((row) => [row.date, row]));

  // Fills in zero-order days so the trend chart shows a continuous series, not just active days.
  const dailyOrders = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const dateKey = toDateOnly(date);
    const existing = dailyByDate.get(dateKey);
    dailyOrders.push({
      date: dateKey,
      count: existing?.count ?? 0,
      revenue: Number(existing?.revenue ?? 0),
    });
  }

  return {
    totalOrders: totals.totalOrders,
    byStatus,
    dispatchesToday: dispatchedToday.count,
    totalOrderValue: Number(valueRow.totalOrderValue),
    dailyOrders,
  };
}
