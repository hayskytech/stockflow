import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

// Never selects password_hash or token data — only safe, displayable fields.
const USER_COLUMNS = `
  id, name, email, role, is_active AS isActive,
  phone, business_name AS businessName, address, town, district, state, pincode,
  last_login_at AS lastLoginAt, created_at AS createdAt, updated_at AS updatedAt
`;

// Optional profile columns shared by createUser/updateUser — mirrors auth.service.js's
// registerCustomer fields, but every one is nullable here since only customers use them.
const PROFILE_COLUMNS = ['phone', 'businessName', 'address', 'town', 'district', 'state', 'pincode'];
const PROFILE_COLUMN_MAP = {
  phone: 'phone',
  businessName: 'business_name',
  address: 'address',
  town: 'town',
  district: 'district',
  state: 'state',
  pincode: 'pincode',
};

/** Blank-string optional fields from the form mean "not set" — normalize to NULL for storage. */
function normalizeProfileValue(value) {
  return value === '' || value === undefined ? null : value;
}

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
    throw new AppError(409, 'Cannot delete a user that is referenced by orders or media.');
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
  const passwordHash = await bcrypt.hash(input.password, 12);
  const profileValues = PROFILE_COLUMNS.map((key) => normalizeProfileValue(input[key]));

  // Re-adding a customer with the same email or phone as a previously soft-deleted (deactivated)
  // customer reactivates that record instead of hitting a duplicate-key error.
  const [inactiveMatch] = await executeQuery(
    `SELECT id FROM users WHERE (email = ? OR (phone IS NOT NULL AND phone = ?)) AND is_active = 0 AND role = 'customer'`,
    [input.email, normalizeProfileValue(input.phone)],
  );

  try {
    if (inactiveMatch) {
      await executeQuery(
        `UPDATE users
         SET name = ?, email = ?, password_hash = ?, role = ?, is_active = 1,
             failed_login_attempts = 0, locked_until = NULL,
             phone = ?, business_name = ?, address = ?, town = ?, district = ?, state = ?, pincode = ?
         WHERE id = ?`,
        [input.name, input.email, passwordHash, input.role, ...profileValues, inactiveMatch.id],
      );
      return getUserById(inactiveMatch.id);
    }

    const id = crypto.randomUUID();
    await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, is_active,
                           phone, business_name, address, town, district, state, pincode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.email, passwordHash, input.role, input.isActive ?? true, ...profileValues],
    );
    return getUserById(id);
  } catch (err) {
    rethrowAsAppError(err);
  }
}

export async function updateUser(id, input) {
  await getUserById(id); // 404s if it doesn't exist

  const columnMap = {
    name: 'name',
    email: 'email',
    role: 'role',
    isActive: 'is_active',
    ...PROFILE_COLUMN_MAP,
  };

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key] !== undefined) {
      const value = PROFILE_COLUMNS.includes(key) ? normalizeProfileValue(input[key]) : input[key];
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }

  // A supplied password resets the login credential — it's permanent immediately, no forced change.
  if (input.password !== undefined) {
    fields.push('password_hash = ?');
    params.push(await bcrypt.hash(input.password, 12));
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

/**
 * Deletes a user. Customers are soft-deleted (deactivated) instead of hard-deleted so their
 * order history stays intact — re-adding the same email/phone later reactivates this same row
 * (see createUser). Admin/staff accounts are still hard-deleted, per the project's no-soft-delete
 * default; customers are the one deliberate exception, since their orders must survive.
 */
export async function deleteUser(id) {
  const user = await getUserById(id); // 404s if it doesn't exist

  if (user.role === 'customer') {
    await executeQuery(`UPDATE users SET is_active = 0 WHERE id = ?`, [id]);
    return;
  }

  try {
    await executeQuery(`DELETE FROM users WHERE id = ?`, [id]);
  } catch (err) {
    rethrowAsAppError(err);
  }
}

// Never selects token_hash — only what's needed to identify a session to its owner.
const SESSION_COLUMNS = `
  id, device_info AS deviceInfo, ip_address AS ipAddress,
  created_at AS createdAt, last_used_at AS lastUsedAt, expires_at AS expiresAt
`;

/** Active (non-revoked, non-expired) sessions for the given user, most recently used first. */
export async function listSessionsForUser(userId) {
  return executeQuery(
    `SELECT ${SESSION_COLUMNS} FROM refresh_tokens
     WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_used_at DESC, created_at DESC`,
    [userId],
  );
}

/** Revokes one of the user's own sessions — a no-op 404 if it's already gone or belongs to someone else. */
export async function revokeSessionForUser(userId, sessionId) {
  const result = await executeQuery(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    [sessionId, userId],
  );
  if (result.affectedRows === 0) throw new AppError(404, 'Session not found');
}
