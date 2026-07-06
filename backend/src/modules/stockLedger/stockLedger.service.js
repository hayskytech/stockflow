import { executeQuery } from '../../db/query.js';

const LEDGER_COLUMNS = `
  l.id, l.change_type AS changeType, l.quantity, l.reference_type AS referenceType,
  l.reference_id AS referenceId, l.note, l.created_at AS createdAt,
  l.product_id AS productId, p.name AS productName, p.product_code AS productCode
`;
const LEDGER_JOINS = `FROM stock_ledger l JOIN products p ON p.id = l.product_id`;

// stockLedger.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  created_at: 'l.created_at',
  quantity: 'l.quantity',
};

/** Read-only list over the append-only movement log — there are no write endpoints here. */
export async function listStockLedger(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(p.name LIKE ? OR p.product_code LIKE ? OR l.note LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (filters.productId) {
    conditions.push('l.product_id = ?');
    params.push(filters.productId);
  }
  if (filters.changeType) {
    conditions.push('l.change_type = ?');
    params.push(filters.changeType);
  }
  if (filters.referenceType) {
    conditions.push('l.reference_type = ?');
    params.push(filters.referenceType);
  }
  // created_at is a UTC DATETIME — date_to is made inclusive by bounding below the next day.
  if (filters.dateFrom) {
    conditions.push('l.created_at >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('l.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(filters.dateTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${LEDGER_COLUMNS} ${LEDGER_JOINS} ${where} ORDER BY ${orderColumn} ${order}, l.id ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total ${LEDGER_JOINS} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}
