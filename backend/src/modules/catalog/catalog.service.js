import crypto from 'crypto';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

const DIVISION_COLUMNS = 'id, name, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt';
const CATEGORY_COLUMNS =
  'c.id, c.division_id AS divisionId, d.name AS divisionName, c.name, c.is_active AS isActive, c.created_at AS createdAt, c.updated_at AS updatedAt';
const CATEGORY_FROM = 'categories c JOIN divisions d ON d.id = c.division_id';
const SUB_CATEGORY_COLUMNS =
  'id, category_id AS categoryId, name, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt';

/** Maps a MySQL error into the right AppError, or rethrows if it's not one we handle. */
function rethrowAsAppError(err, { onDuplicate, onRestricted }) {
  if (err.code === 'ER_DUP_ENTRY' && onDuplicate) throw new AppError(409, onDuplicate);
  if ((err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') && onRestricted) {
    throw new AppError(409, onRestricted);
  }
  throw err;
}

// ---------------------------------------------------------------------------
// Divisions
// ---------------------------------------------------------------------------

export async function listDivisions(listQuery) {
  const { perPage, offset, search, orderby, order } = listQuery;
  const where = search ? 'WHERE name LIKE ?' : '';
  const params = search ? [`%${search}%`] : [];

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${DIVISION_COLUMNS} FROM divisions ${where} ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM divisions ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getDivisionById(id) {
  const [row] = await executeQuery(`SELECT ${DIVISION_COLUMNS} FROM divisions WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'Division not found');
  return row;
}

export async function createDivision(input) {
  const id = crypto.randomUUID();
  try {
    await executeQuery(`INSERT INTO divisions (id, name, is_active) VALUES (?, ?, ?)`, [
      id,
      input.name,
      input.isActive ?? true,
    ]);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A division with this name already exists' });
  }
  return getDivisionById(id);
}

export async function updateDivision(id, input) {
  await getDivisionById(id);

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

  params.push(id);
  try {
    await executeQuery(`UPDATE divisions SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A division with this name already exists' });
  }
  return getDivisionById(id);
}

export async function deleteDivision(id) {
  await getDivisionById(id);
  try {
    await executeQuery(`DELETE FROM divisions WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err, {
      onRestricted: 'Cannot delete a division that still has categories under it. Deactivate it instead.',
    });
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('c.name LIKE ?');
    params.push(`%${search}%`);
  }
  if (filters.divisionId) {
    conditions.push('c.division_id = ?');
    params.push(filters.divisionId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${CATEGORY_COLUMNS} FROM ${CATEGORY_FROM} ${where} ORDER BY c.${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM ${CATEGORY_FROM} ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getCategoryById(id) {
  const [row] = await executeQuery(`SELECT ${CATEGORY_COLUMNS} FROM ${CATEGORY_FROM} WHERE c.id = ?`, [id]);
  if (!row) throw new AppError(404, 'Category not found');
  return row;
}

export async function createCategory(input) {
  await getDivisionById(input.divisionId); // 404s if the division doesn't exist

  const id = crypto.randomUUID();
  try {
    await executeQuery(`INSERT INTO categories (id, division_id, name, is_active) VALUES (?, ?, ?, ?)`, [
      id,
      input.divisionId,
      input.name,
      input.isActive ?? true,
    ]);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A category with this name already exists under this division' });
  }
  return getCategoryById(id);
}

export async function updateCategory(id, input) {
  await getCategoryById(id);
  if (input.divisionId !== undefined) {
    await getDivisionById(input.divisionId); // 404s if the target division doesn't exist
  }

  const fields = [];
  const params = [];
  if (input.divisionId !== undefined) {
    fields.push('division_id = ?');
    params.push(input.divisionId);
  }
  if (input.name !== undefined) {
    fields.push('name = ?');
    params.push(input.name);
  }
  if (input.isActive !== undefined) {
    fields.push('is_active = ?');
    params.push(input.isActive);
  }

  params.push(id);
  try {
    await executeQuery(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A category with this name already exists under this division' });
  }
  return getCategoryById(id);
}

export async function deleteCategory(id) {
  await getCategoryById(id);
  try {
    await executeQuery(`DELETE FROM categories WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err, {
      onRestricted: 'Cannot delete a category that still has sub-categories or products under it. Deactivate it instead.',
    });
  }
}

// ---------------------------------------------------------------------------
// Sub-categories
// ---------------------------------------------------------------------------

export async function listSubCategories(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('name LIKE ?');
    params.push(`%${search}%`);
  }
  if (filters.categoryId) {
    conditions.push('category_id = ?');
    params.push(filters.categoryId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${SUB_CATEGORY_COLUMNS} FROM sub_categories ${where} ORDER BY ${orderby} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM sub_categories ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getSubCategoryById(id) {
  const [row] = await executeQuery(`SELECT ${SUB_CATEGORY_COLUMNS} FROM sub_categories WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'Sub-category not found');
  return row;
}

export async function createSubCategory(input) {
  await getCategoryById(input.categoryId); // 404s if the category doesn't exist

  const id = crypto.randomUUID();
  try {
    await executeQuery(`INSERT INTO sub_categories (id, category_id, name, is_active) VALUES (?, ?, ?, ?)`, [
      id,
      input.categoryId,
      input.name,
      input.isActive ?? true,
    ]);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A sub-category with this name already exists under this category' });
  }
  return getSubCategoryById(id);
}

export async function updateSubCategory(id, input) {
  await getSubCategoryById(id);
  if (input.categoryId !== undefined) {
    await getCategoryById(input.categoryId); // 404s if the target category doesn't exist
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

  params.push(id);
  try {
    await executeQuery(`UPDATE sub_categories SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err, { onDuplicate: 'A sub-category with this name already exists under this category' });
  }
  return getSubCategoryById(id);
}

export async function deleteSubCategory(id) {
  await getSubCategoryById(id);
  try {
    await executeQuery(`DELETE FROM sub_categories WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err, {
      onRestricted: 'Cannot delete a sub-category that still has products under it. Deactivate it instead.',
    });
  }
}
