import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

// Never selects password_hash or token data — only safe, displayable fields.
const USER_COLUMNS = `
  id, name, email, role, is_active AS isActive, must_change_password AS mustChangePassword,
  last_login_at AS lastLoginAt, created_at AS createdAt, updated_at AS updatedAt
`;

// users.router.js whitelists these same keys for `orderby`.
const SORT_COLUMNS = {
  name: 'name',
  email: 'email',
  role: 'role',
  created_at: 'created_at',
};

/** Maps a MySQL error into the right AppError, or rethrows if it's not one we handle. */
function rethrowAsAppError(err) {
  if (err.code === 'ER_DUP_ENTRY') {
    throw new AppError(409, 'Email is already registered');
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    throw new AppError(409, 'Cannot delete a user that is referenced by orders, dispatches, or media.');
  }
  throw err;
}

export async function listUsers(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (filters.role) {
    conditions.push('role = ?');
    params.push(filters.role);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMNS[orderby] ?? SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${USER_COLUMNS} FROM users ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM users ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getUserById(id) {
  const [row] = await executeQuery(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
  if (!row) throw new AppError(404, 'User not found');
  return row;
}

export async function createUser(input) {
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.email,
        passwordHash,
        input.role,
        input.isActive ?? true,
        input.mustChangePassword ?? true,
      ],
    );
  } catch (err) {
    rethrowAsAppError(err);
  }

  return getUserById(id);
}

export async function updateUser(id, input) {
  await getUserById(id); // 404s if it doesn't exist

  const columnMap = {
    name: 'name',
    email: 'email',
    role: 'role',
    isActive: 'is_active',
    mustChangePassword: 'must_change_password',
  };

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key]);
    }
  }

  // A supplied password resets the login credential and forces a change on next login.
  if (input.password !== undefined) {
    fields.push('password_hash = ?', 'must_change_password = ?');
    params.push(await bcrypt.hash(input.password, 12), true);
  }

  if (fields.length === 0) return getUserById(id);

  params.push(id);
  try {
    await executeQuery(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    rethrowAsAppError(err);
  }
  return getUserById(id);
}

export async function deleteUser(id) {
  await getUserById(id); // 404s if it doesn't exist
  try {
    await executeQuery(`DELETE FROM users WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err);
  }
}
