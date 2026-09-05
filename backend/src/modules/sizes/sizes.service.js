import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const SIZE_COLUMNS = 'id, value, is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt';

/**
 * Mirrors catalog.service.js's rethrowAsAppError: the SELECT-based pre-check below gives a
 * fast, friendly error for the common non-racing case, but two concurrent creates/updates can
 * both pass that check before either write commits. uq_sizes_business_value (per-business
 * DB-level UNIQUE on `value`) is what actually closes the race — this turns the resulting
 * ER_DUP_ENTRY into the same clean 409 instead of an unhandled 500.
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

/** Uniqueness is per-business (uq_sizes_business_value). */
async function assertValueNotTaken(businessId, value, excludeId) {
  const conditions = [`${NORMALIZED_VALUE_SQL} = ?`, 'business_id = ?'];
  const params = [normalizeValue(value), businessId];
  if (excludeId) {
    conditions.push('id != ?');
    params.push(excludeId);
  }
  const [dup] = await executeQuery(`SELECT id FROM sizes WHERE ${conditions.join(' AND ')}`, params);
  if (dup) throw new AppError(409, 'This size already exists');
}

/** New rows join at the end of this business's manual drag-and-drop order, not the front. */
async function nextSortOrder(businessId) {
  const [row] = await executeQuery(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM sizes WHERE business_id = ?`,
    [businessId],
  );
  return row.next;
}

export async function listSizes(businessId, listQuery) {
  const { perPage, offset, search, orderby, order } = listQuery;
  const conditions = ['business_id = ?'];
  const params = [businessId];
  if (search) {
    conditions.push('value LIKE ?');
    params.push(`%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${SIZE_COLUMNS} FROM sizes ${where} ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM sizes ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getSizeById(businessId, id) {
  const [row] = await executeQuery(`SELECT ${SIZE_COLUMNS} FROM sizes WHERE id = ? AND business_id = ?`, [id, businessId]);
  if (!row) throw new AppError(404, 'Size not found');
  return row;
}

export async function createSize(businessId, input) {
  await assertValueNotTaken(businessId, input.value);

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder(businessId);
  try {
    await executeQuery(`INSERT INTO sizes (id, business_id, value, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`, [
      id,
      businessId,
      input.value,
      input.isActive ?? true,
      sortOrder,
    ]);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getSizeById(businessId, id);
}

/** Persists a full manual reorder — every size in this business must be present exactly once. */
export async function reorderSizes(businessId, orderedIds) {
  const existing = await executeQuery(`SELECT id FROM sizes WHERE business_id = ?`, [businessId]);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every size exactly once');
  }

  // Sequential — concurrent execute() calls on one transaction connection are unsafe.
  await withTransaction(async (execute) => {
    for (const [index, id] of orderedIds.entries()) {
      await execute(`UPDATE sizes SET sort_order = ? WHERE id = ? AND business_id = ?`, [index, id, businessId]);
    }
  });
}

export async function updateSize(businessId, id, input) {
  await getSizeById(businessId, id);

  if (input.value !== undefined) {
    await assertValueNotTaken(businessId, input.value, id);
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

  params.push(id, businessId);
  try {
    await executeQuery(`UPDATE sizes SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getSizeById(businessId, id);
}

// No FK from products/stock onto sizes (they store the value directly, not a reference — see
// CLAUDE.md), so deleting a size never fails with a restriction error; existing products/stock
// simply keep the plain-text value they already had.
export async function deleteSize(businessId, id) {
  await getSizeById(businessId, id);
  await executeQuery(`DELETE FROM sizes WHERE id = ? AND business_id = ?`, [id, businessId]);
}
