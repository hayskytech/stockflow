import { executeQuery } from '../../db/query.js';

const NOTICE_COLUMNS = `
  business_id AS businessId, message, is_active AS isActive,
  created_at AS createdAt, updated_at AS updatedAt
`;

const COLUMN_MAP = {
  message: 'message',
  isActive: 'is_active',
};

/** A business with no notice row yet reads back a default (inactive, no message). */
export async function getNotice(businessId) {
  const [row] = await executeQuery(`SELECT ${NOTICE_COLUMNS} FROM notice WHERE business_id = ?`, [businessId]);
  return row ?? { businessId, message: null, isActive: false, createdAt: null, updatedAt: null };
}

/**
 * Public subset for the unauthenticated storefront — empty when the notice is switched off.
 * TODO(storefront): needs business context when re-enabled — the storefront is disabled so this
 * is unreachable (the route is storefrontEnabled-gated and 404s before this runs).
 */
export async function getPublicNotice() {
  return { message: null };
}

/** Upsert — creates the notice row on first write, merges into it thereafter. */
export async function updateNotice(businessId, input) {
  const columns = [];
  const placeholders = [];
  const params = [];
  const updates = [];
  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    if (input[key] !== undefined) {
      columns.push(column);
      placeholders.push('?');
      params.push(input[key] === '' ? null : input[key]);
      updates.push(`${column} = VALUES(${column})`);
    }
  }

  if (columns.length === 0) return getNotice(businessId);

  await executeQuery(
    `INSERT INTO notice (business_id, ${columns.join(', ')})
     VALUES (?, ${placeholders.join(', ')})
     ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
    [businessId, ...params],
  );

  return getNotice(businessId);
}
