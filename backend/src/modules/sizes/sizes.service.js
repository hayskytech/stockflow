import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const SIZE_COLUMNS = 'id, value, is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt';

/**
 * Mirrors catalog.service.js's rethrowAsAppError: the SELECT-based pre-check below gives a
 * fast, friendly error for the common non-racing case, but two concurrent creates/updates can
 * both pass that check before either write commits. uq_sizes_value (DB-level UNIQUE on `value`)
 * is what actually closes the race — this turns the resulting ER_DUP_ENTRY into the same clean
 * 409 instead of an unhandled 500.
 */
function rethrowAsAppError(err) {
  if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'This size already exists');
  throw err;
}

// Mirrors catalog.service.js's normalized-name dedup — "XL", "xl" and " XL " shouldn't
// coexist as if they were different sizes.
const NORMALIZED_VALUE_SQL = "LOWER(REPLACE(value, ' ', ''))";
function normalizeValue(value) {
  return value.toLowerCase().replace(/\s+/g, '');
}

async function assertValueNotTaken(value, excludeId) {
  const conditions = [`${NORMALIZED_VALUE_SQL} = ?`];
  const params = [normalizeValue(value)];
  if (excludeId) {
    conditions.push('id != ?');
    params.push(excludeId);
  }
  const [dup] = await executeQuery(`SELECT id FROM sizes WHERE ${conditions.join(' AND ')}`, params);
  if (dup) throw new AppError(409, 'This size already exists');
}

/** New rows join at the end of manual drag-and-drop order, not the front (sort_order 0). */
async function nextSortOrder() {
  const [row] = await executeQuery(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM sizes`);
  return row.next;
}

export async function listSizes(listQuery) {
  const { perPage, offset, search, orderby, order } = listQuery;
  const where = search ? 'WHERE value LIKE ?' : '';
  const params = search ? [`%${search}%`] : [];

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${SIZE_COLUMNS} FROM sizes ${where} ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM sizes ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getSizeById(id) {
  const [row] = await executeQuery(`SELECT ${SIZE_COLUMNS} FROM sizes WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'Size not found');
  return row;
}

export async function createSize(input) {
  await assertValueNotTaken(input.value);

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder();
  try {
    await executeQuery(`INSERT INTO sizes (id, value, is_active, sort_order) VALUES (?, ?, ?, ?)`, [
      id,
      input.value,
      input.isActive ?? true,
      sortOrder,
    ]);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getSizeById(id);
}

/** Persists a full manual reorder — every existing size id must be present exactly once. */
export async function reorderSizes(orderedIds) {
  const existing = await executeQuery(`SELECT id FROM sizes`);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every size exactly once');
  }

  await withTransaction(async (execute) => {
    await Promise.all(orderedIds.map((id, index) => execute(`UPDATE sizes SET sort_order = ? WHERE id = ?`, [index, id])));
  });
}

export async function updateSize(id, input) {
  await getSizeById(id);

  if (input.value !== undefined) {
    await assertValueNotTaken(input.value, id);
  }

  const fields = [];
  const params = [];
  if (input.value !== undefined) {
    fields.push('value = ?');
    params.push(input.value);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }

  params.push(id);
  try {
    await executeQuery(`UPDATE sizes SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getSizeById(id);
}

// No FK from products/stock onto sizes (they store the value directly, not a reference — see
// CLAUDE.md), so deleting a size never fails with a restriction error; existing products/stock
// simply keep the plain-text value they already had.
export async function deleteSize(id) {
  await getSizeById(id);
  await executeQuery(`DELETE FROM sizes WHERE id = ?`, [id]);
}
