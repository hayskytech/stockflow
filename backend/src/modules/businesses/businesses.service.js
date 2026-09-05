import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { executeQuery } from '../../db/query.js';
import { withTransaction } from '../../db/transaction.js';
import { AppError } from '../../middleware/errorHandler.js';

const BUSINESS_COLUMNS = `
  b.id, b.name, b.slug, b.is_active AS isActive,
  b.created_at AS createdAt, b.updated_at AS updatedAt
`;

// Active-member headcount, selected alongside every business row.
const MEMBER_COUNT_SUBQUERY =
  '(SELECT COUNT(*) FROM memberships m WHERE m.business_id = b.id AND m.is_active = 1) AS memberCount';

// businesses.router.js whitelists these same keys for `orderby`.
const BUSINESS_SORT_COLUMNS = {
  name: 'b.name',
  slug: 'b.slug',
  created_at: 'b.created_at',
};

const MEMBER_COLUMNS = `
  u.id AS userId, u.name, u.email, u.phone, m.role, m.created_at AS memberSince
`;

// businesses.router.js whitelists these same keys for the members list's `orderby`.
const MEMBER_SORT_COLUMNS = {
  name: 'u.name',
  email: 'u.email',
  role: 'm.role',
  created_at: 'm.created_at',
};

const DUPLICATE_SLUG_MESSAGE = 'A business with this name/slug already exists';

/** Turns a display name into a URL-safe slug: lowercase, spaces/underscores → `-`, drop the rest. */
export function slugify(name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'business';
}

/** Fetches one business row (with memberCount) via the given executor; 404s if it's missing. */
async function fetchBusinessRow(exec, id) {
  const [row] = await exec(
    `SELECT ${BUSINESS_COLUMNS}, ${MEMBER_COUNT_SUBQUERY} FROM businesses b WHERE b.id = ?`,
    [id],
  );
  if (!row) throw new AppError(404, 'Business not found');
  return row;
}

/** Fetches one active member row (listMembers shape) via the given executor, or undefined. */
async function fetchMemberRow(exec, businessId, userId) {
  const [row] = await exec(
    `SELECT ${MEMBER_COLUMNS}
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.business_id = ? AND m.user_id = ? AND m.is_active = 1`,
    [businessId, userId],
  );
  return row;
}

/** Counts a business's active admins — used by the last-admin guards. */
async function countActiveAdmins(exec, businessId) {
  const [{ adminCount }] = await exec(
    `SELECT COUNT(*) AS adminCount FROM memberships
     WHERE business_id = ? AND role = 'admin' AND is_active = 1`,
    [businessId],
  );
  return adminCount;
}

export async function listBusinesses(listQuery, filters) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(b.name LIKE ? OR b.slug LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (filters.isActive !== undefined) {
    conditions.push('b.is_active = ?');
    params.push(filters.isActive);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = BUSINESS_SORT_COLUMNS[orderby] ?? BUSINESS_SORT_COLUMNS.name;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${BUSINESS_COLUMNS}, ${MEMBER_COUNT_SUBQUERY} FROM businesses b
       ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(`SELECT COUNT(*) AS total FROM businesses b ${where}`, params),
  ]);

  return { rows, total: countRows[0].total };
}

export async function getBusinessById(id) {
  return fetchBusinessRow(executeQuery, id);
}

/**
 * Creates a business and, optionally, seeds its first admin — all in one transaction.
 * `initialAdminEmail` naming an existing user just grants them an admin membership; naming a new
 * user requires `initialAdminPassword` (AppError 400) and creates the `users` row first.
 */
export async function createBusiness(input, actingUserId) {
  void actingUserId; // reserved for future audit context; not persisted (no audit logging)
  const slug = input.slug ?? slugify(input.name);

  return withTransaction(async (execute) => {
    const businessId = crypto.randomUUID();
    try {
      await execute(`INSERT INTO businesses (id, name, slug, is_active) VALUES (?, ?, ?, 1)`, [
        businessId,
        input.name,
        slug,
      ]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, DUPLICATE_SLUG_MESSAGE);
      throw err;
    }

    if (input.initialAdminEmail) {
      const [existing] = await execute(`SELECT id FROM users WHERE email = ?`, [input.initialAdminEmail]);

      let adminUserId;
      if (existing) {
        adminUserId = existing.id;
      } else {
        if (!input.initialAdminPassword) {
          throw new AppError(400, 'A password is required to create the admin account');
        }
        adminUserId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash(input.initialAdminPassword, 12);
        const name = input.initialAdminName ?? null;
        await execute(
          `INSERT INTO users (id, name, email, password_hash, role, is_super_admin, profile_completed_at)
           VALUES (?, ?, ?, ?, 'admin', 0, ${name ? 'NOW()' : 'NULL'})`,
          [adminUserId, name, input.initialAdminEmail, passwordHash],
        );
      }

      await execute(`INSERT INTO memberships (id, user_id, business_id, role) VALUES (?, ?, ?, 'admin')`, [
        crypto.randomUUID(),
        adminUserId,
        businessId,
      ]);
    }

    return fetchBusinessRow(execute, businessId);
  });
}

export async function updateBusiness(id, input) {
  await getBusinessById(id); // 404s if it doesn't exist

  const columnMap = { name: 'name', slug: 'slug', isActive: 'is_active' };
  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key]);
    }
  }

  if (fields.length === 0) return getBusinessById(id);

  params.push(id);
  try {
    await executeQuery(`UPDATE businesses SET ${fields.join(', ')} WHERE id = ?`, params);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, DUPLICATE_SLUG_MESSAGE);
    throw err;
  }
  return getBusinessById(id);
}

/**
 * The "delete" for a business (plan decision 5): deactivate, never hard-delete. A real cascade
 * wipe stays dev-only. Returns nothing — the controller answers 204.
 */
export async function deactivateBusiness(id) {
  await getBusinessById(id); // 404s if it doesn't exist
  await executeQuery(`UPDATE businesses SET is_active = 0 WHERE id = ?`, [id]);
}

export async function listMembers(businessId, listQuery) {
  const { perPage, offset, search, orderby, order } = listQuery;

  const conditions = ['m.business_id = ?', 'm.is_active = 1'];
  const params = [businessId];
  if (search) {
    conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const orderColumn = MEMBER_SORT_COLUMNS[orderby] ?? MEMBER_SORT_COLUMNS.created_at;

  const [rows, countRows] = await Promise.all([
    executeQuery(
      `SELECT ${MEMBER_COLUMNS}
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       ${where} ORDER BY ${orderColumn} ${order} LIMIT ? OFFSET ?`,
      [...params, perPage, offset],
    ),
    executeQuery(
      `SELECT COUNT(*) AS total
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       ${where}`,
      params,
    ),
  ]);

  return { rows, total: countRows[0].total };
}

/**
 * Adds a member to a business by email, in one transaction:
 *   - existing user + active membership  → 409 (already a member)
 *   - existing user + inactive membership → reactivate it with the requested role
 *   - existing user + no membership       → insert one
 *   - new user                            → `password` required (400), create the user, then insert
 */
export async function addMember(businessId, input, actingUserId) {
  void actingUserId; // reserved for future audit context; not persisted (no audit logging)

  return withTransaction(async (execute) => {
    await fetchBusinessRow(execute, businessId); // 404s if the business is gone

    const [existing] = await execute(`SELECT id FROM users WHERE email = ?`, [input.email]);

    let memberUserId;
    if (existing) {
      memberUserId = existing.id;
      const [membership] = await execute(
        `SELECT id, is_active FROM memberships WHERE user_id = ? AND business_id = ?`,
        [memberUserId, businessId],
      );

      if (membership && membership.is_active) {
        throw new AppError(409, 'This user is already a member');
      }
      if (membership) {
        await execute(`UPDATE memberships SET is_active = 1, role = ? WHERE id = ?`, [input.role, membership.id]);
      } else {
        await execute(`INSERT INTO memberships (id, user_id, business_id, role) VALUES (?, ?, ?, ?)`, [
          crypto.randomUUID(),
          memberUserId,
          businessId,
          input.role,
        ]);
      }
    } else {
      if (!input.password) {
        throw new AppError(400, 'A password is required to create a new user account');
      }
      memberUserId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(input.password, 12);
      const name = input.name ?? null;
      try {
        await execute(
          `INSERT INTO users (id, name, email, password_hash, role, is_super_admin, profile_completed_at)
           VALUES (?, ?, ?, ?, ?, 0, ${name ? 'NOW()' : 'NULL'})`,
          [memberUserId, name, input.email, passwordHash, input.role],
        );
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new AppError(409, 'A user with this email already exists');
        throw err;
      }
      await execute(`INSERT INTO memberships (id, user_id, business_id, role) VALUES (?, ?, ?, ?)`, [
        crypto.randomUUID(),
        memberUserId,
        businessId,
        input.role,
      ]);
    }

    return fetchMemberRow(execute, businessId, memberUserId);
  });
}

/**
 * Changes a member's role. Demoting the last remaining active admin to staff is rejected (409) —
 * a business must always keep at least one admin.
 */
export async function updateMemberRole(businessId, userId, role, actingUserId) {
  void actingUserId;

  const [membership] = await executeQuery(
    `SELECT id, role FROM memberships WHERE business_id = ? AND user_id = ? AND is_active = 1`,
    [businessId, userId],
  );
  if (!membership) throw new AppError(404, 'Membership not found');

  if (membership.role === 'admin' && role === 'staff') {
    if ((await countActiveAdmins(executeQuery, businessId)) <= 1) {
      throw new AppError(409, 'A business must keep at least one admin');
    }
  }

  await executeQuery(`UPDATE memberships SET role = ? WHERE id = ?`, [role, membership.id]);
  return fetchMemberRow(executeQuery, businessId, userId);
}

/**
 * Removes a member (soft: `is_active = 0`, keeping history — mirrors the customer soft-delete rule).
 * Removing the last active admin is rejected (409). A member removing themselves is fine as long as
 * that guard passes. Returns nothing — the controller answers 204.
 */
export async function removeMember(businessId, userId, actingUserId) {
  void actingUserId;

  const [membership] = await executeQuery(
    `SELECT id, role FROM memberships WHERE business_id = ? AND user_id = ? AND is_active = 1`,
    [businessId, userId],
  );
  if (!membership) throw new AppError(404, 'Membership not found');

  if (membership.role === 'admin') {
    if ((await countActiveAdmins(executeQuery, businessId)) <= 1) {
      throw new AppError(409, 'A business must keep at least one admin');
    }
  }

  await executeQuery(`UPDATE memberships SET is_active = 0 WHERE id = ?`, [membership.id]);
}
