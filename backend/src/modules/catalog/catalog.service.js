import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const CATEGORY_COLUMNS =
  'c.id, c.name, c.is_active AS isActive, c.sort_order AS sortOrder, c.created_at AS createdAt, c.updated_at AS updatedAt';
const CATEGORY_FROM = 'categories c';
const SUB_CATEGORY_COLUMNS =
  'id, category_id AS categoryId, name, is_active AS isActive, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt';

/** Maps a MySQL error into the right AppError, or rethrows if it's not one we handle. */
function rethrowAsAppError(err, { onDuplicate, onRestricted }) {
  if (err.code === 'ER_DUP_ENTRY' && onDuplicate) throw new AppError(409, onDuplicate);
  if ((err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') && onRestricted) {
    throw new AppError(409, onRestricted);
  }
  throw err;
}

// The DB's unique constraint alone would let "New Delhi", "new-delhi" and "NewDelhi" coexist
// as if they were different names. This normalized SQL expression (strip spaces/hyphens,
// lowercase) is applied on both sides of the comparison so a pre-insert/update check catches
// those as the same name before the raw unique constraint ever gets a chance to.
const NORMALIZED_NAME_SQL = "LOWER(REPLACE(REPLACE(name, ' ', ''), '-', ''))";
function normalizeName(name) {
  return name.toLowerCase().replace(/[\s-]+/g, '');
}

/**
 * Throws the given 409 message if another row in this business (optionally further scoped,
 * optionally excluding one id) has an equivalent name. Always scoped to `businessId` — uniqueness
 * is per-business (uq_categories_business_name / uq_sub_categories_business_category_name).
 */
async function assertNameNotTaken(table, businessId, name, message, { scopeColumn, scopeValue, excludeId } = {}) {
  const conditions = [`${NORMALIZED_NAME_SQL} = ?`, 'business_id = ?'];
  const params = [normalizeName(name), businessId];
  if (scopeColumn) {
    conditions.push(`${scopeColumn} = ?`);
    params.push(scopeValue);
  }
  if (excludeId) {
    conditions.push('id != ?');
    params.push(excludeId);
  }
  const [dup] = await executeQuery(`SELECT id FROM ${table} WHERE ${conditions.join(' AND ')}`, params);
  if (dup) throw new AppError(409, message);
}

/** New rows join at the end of this business's manual drag-and-drop order, not the front. */
async function nextSortOrder(table, businessId, scopeColumn, scopeValue) {
  const conditions = ['business_id = ?'];
  const params = [businessId];
  if (scopeColumn) {
    conditions.push(`${scopeColumn} = ?`);
    params.push(scopeValue);
  }
  const [row] = await executeQuery(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM ${table} WHERE ${conditions.join(' AND ')}`,
    params,
  );
  return row.next;
}

// ---------------------------------------------------------------------------
// Categories — top-level of the product tree (there are no divisions above them).
// ---------------------------------------------------------------------------

export async function listCategories(businessId, listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['c.business_id = ?'];
  const params = [businessId];
  if (search) {
    conditions.push('c.name LIKE ?');
    params.push(`%${search}%`);
  }
  if (filters.isActive !== undefined) {
    conditions.push('c.is_active = ?');
    params.push(filters.isActive);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${CATEGORY_COLUMNS} FROM ${CATEGORY_FROM} ${where} ORDER BY c.${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM ${CATEGORY_FROM} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getCategoryById(businessId, id) {
  const [row] = await executeQuery(
    `SELECT ${CATEGORY_COLUMNS} FROM ${CATEGORY_FROM} WHERE c.id = ? AND c.business_id = ?`,
    [id, businessId],
  );
  if (!row) throw new AppError(404, 'Category not found');
  return row;
}

export async function createCategory(businessId, input) {
  await assertNameNotTaken('categories', businessId, input.name, 'A category with this name already exists');

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder('categories', businessId);
  try {
    await executeQuery(`INSERT INTO categories (id, business_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?)`, [
      id,
      businessId,
      input.name,
      input.isActive ?? true,
      sortOrder,
    ]);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A category with this name already exists' });
  }
  return getCategoryById(businessId, id);
}

/** Persists a full manual reorder — every category in this business must be present exactly once. */
export async function reorderCategories(businessId, orderedIds) {
  const existing = await executeQuery(`SELECT id FROM categories WHERE business_id = ?`, [businessId]);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every category exactly once');
  }

  await withTransaction(async (execute) => {
    for (const [index, id] of orderedIds.entries()) {
      await execute(`UPDATE categories SET sort_order = ? WHERE id = ? AND business_id = ?`, [index, id, businessId]);
    }
  });
}

export async function updateCategory(businessId, id, input) {
  await getCategoryById(businessId, id);

  if (input.name !== undefined) {
    await assertNameNotTaken('categories', businessId, input.name, 'A category with this name already exists', {
      excludeId: id,
    });
  }

  const fields = [];
  const params = [];
  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }

  params.push(id, businessId);
  try {
    await executeQuery(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A category with this name already exists' });
  }
  return getCategoryById(businessId, id);
}

export async function deleteCategory(businessId, id) {
  await getCategoryById(businessId, id);
  try {
    await executeQuery(`DELETE FROM categories WHERE id = ? AND business_id = ?`, [id, businessId]);
  } catch (err) {
    rethrowAsAppError(err, {
      onRestricted: 'Cannot delete a category that still has sub-categories or products under it. Deactivate it instead.',
    });
  }
}

// ---------------------------------------------------------------------------
// Sub-categories
// ---------------------------------------------------------------------------

export async function listSubCategories(businessId, listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['business_id = ?'];
  const params = [businessId];
  if (search) {
    conditions.push('name LIKE ?');
    params.push(`%${search}%`);
  }
  if (filters.categoryId) {
    conditions.push('category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.isActive !== undefined) {
    conditions.push('is_active = ?');
    params.push(filters.isActive);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${SUB_CATEGORY_COLUMNS} FROM sub_categories ${where} ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM sub_categories ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getSubCategoryById(businessId, id) {
  const [row] = await executeQuery(
    `SELECT ${SUB_CATEGORY_COLUMNS} FROM sub_categories WHERE id = ? AND business_id = ?`,
    [id, businessId],
  );
  if (!row) throw new AppError(404, 'Sub-category not found');
  return row;
}

export async function createSubCategory(businessId, input) {
  await getCategoryById(businessId, input.categoryId); // 404s if the parent isn't in this business
  await assertNameNotTaken(
    'sub_categories',
    businessId,
    input.name,
    'A sub-category with this name already exists under this category',
    { scopeColumn: 'category_id', scopeValue: input.categoryId },
  );

  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder('sub_categories', businessId, 'category_id', input.categoryId);
  try {
    await executeQuery(
      `INSERT INTO sub_categories (id, business_id, category_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, businessId, input.categoryId, input.name, input.isActive ?? true, sortOrder],
    );
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A sub-category with this name already exists under this category' });
  }
  return getSubCategoryById(businessId, id);
}

/** Persists a full manual reorder — every sub-category in the category must be present exactly once. */
export async function reorderSubCategories(businessId, categoryId, orderedIds) {
  const existing = await executeQuery(`SELECT id FROM sub_categories WHERE category_id = ? AND business_id = ?`, [
    categoryId,
    businessId,
  ]);
  const existingIds = new Set(existing.map((row) => row.id));
  if (orderedIds.length !== existingIds.size || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError(400, 'orderedIds must contain every sub-category in this category exactly once');
  }

  await withTransaction(async (execute) => {
    for (const [index, id] of orderedIds.entries()) {
      await execute(`UPDATE sub_categories SET sort_order = ? WHERE id = ? AND business_id = ?`, [index, id, businessId]);
    }
  });
}

export async function updateSubCategory(businessId, id, input) {
  const existing = await getSubCategoryById(businessId, id);
  if (input.categoryId !== undefined) {
    await getCategoryById(businessId, input.categoryId); // 404s if the target category isn't in this business
  }

  if (input.name !== undefined) {
    await assertNameNotTaken(
      'sub_categories',
      businessId,
      input.name,
      'A sub-category with this name already exists under this category',
      { scopeColumn: 'category_id', scopeValue: input.categoryId ?? existing.categoryId, excludeId: id },
    );
  }

  const fields = [];
  const params = [];
  if (input.categoryId !== undefined) {
    fields.push('category_id = ?');
    params.push(input.categoryId);
  }
  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }

  params.push(id, businessId);
  try {
    await executeQuery(`UPDATE sub_categories SET ${fields.join(', ')} WHERE id = ? AND business_id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A sub-category with this name already exists under this category' });
  }
  return getSubCategoryById(businessId, id);
}

export async function deleteSubCategory(businessId, id) {
  await getSubCategoryById(businessId, id);
  try {
    await executeQuery(`DELETE FROM sub_categories WHERE id = ? AND business_id = ?`, [id, businessId]);
  } catch (err) {
    rethrowAsAppError(err, {
      onRestricted: 'Cannot delete a sub-category that still has products under it. Deactivate it instead.',
    });
  }
}
