import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

const WAREHOUSE_COLUMNS = `
  id, name, address, phone, email,
  bank_name AS bankName, account_holder_name AS accountHolderName,
  account_number AS accountNumber, ifsc_code AS ifscCode, upi_id AS upiId,
  created_at AS createdAt, updated_at AS updatedAt
`;

const COLUMN_MAP = {
  name: 'name',
  address: 'address',
  phone: 'phone',
  email: 'email',
  bankName: 'bank_name',
  accountHolderName: 'account_holder_name',
  accountNumber: 'account_number',
  ifscCode: 'ifsc_code',
  upiId: 'upi_id',
};

export async function getWarehouse() {
  const [row] = await executeQuery(`SELECT ${WAREHOUSE_COLUMNS} FROM warehouse WHERE id = 1`);
  if (!row) throw new AppError(404, 'Warehouse settings have not been configured yet');
  return row;
}

/** Public subset for unauthenticated screens (e.g. login/register site title) — name only, never bank details. */
export async function getPublicWarehouseInfo() {
  const [row] = await executeQuery(`SELECT name FROM warehouse WHERE id = 1`);
  return { name: row?.name ?? null };
}

export async function updateWarehouse(input) {
  await getWarehouse(); // 404s if the single settings row doesn't exist yet

  const fields = [];
  const params = [];
  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    if (input[key] !== undefined) {
      fields.push(`${column} = ?`);
      params.push(input[key] === '' ? null : input[key]);
    }
  }
  if (fields.length === 0) return getWarehouse();

  params.push(1);
  await executeQuery(`UPDATE warehouse SET ${fields.join(', ')} WHERE id = ?`, params);
  return getWarehouse();
}
