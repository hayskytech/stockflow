import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

const NOTICE_COLUMNS = `
  id, message, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
`;

const COLUMN_MAP = {
  message: 'message',
  isActive: 'is_active',
};

export async function getNotice() {
  const [row] = await executeQuery(`SELECT ${NOTICE_COLUMNS} FROM notice WHERE id = 1`);
  if (!row) throw new AppError(404, 'Notice board has not been configured yet');
  return row;
}

/** Public subset for the unauthenticated storefront — empty when the notice is switched off. */
export async function getPublicNotice() {
  const [row] = await executeQuery(`SELECT message, is_active AS isActive FROM notice WHERE id = 1`);
  if (!row || !row.isActive || !row.message) return { message: null };
  return { message: row.message };
}

export async function updateNotice(input) {
  await getNotice(); // 404s if the single settings row doesn't exist yet

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key] === '' ? null : input[key]);
    }
  }
  if (fields.length === 0) return getNotice();

  params.push(1);
  await executeQuery(`UPDATE notice SET ${fields.join(', ')} WHERE id = ?`, params);
  return getNotice();
}
