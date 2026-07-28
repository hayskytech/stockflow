import { executeQuery } from '../../db/query.js';
import { AppError } from '../../middleware/errorHandler.js';

const WAREHOUSE_COLUMNS = `
  id, name, address, phone, email,
  bank_name AS bankName, account_holder_name AS accountHolderName,
  account_number AS accountNumber, ifsc_code AS ifscCode, upi_id AS upiId,
  phone_country_code AS phoneCountryCode, phone_number_length AS phoneNumberLength,
  currency_symbol AS currencySymbol, currency_decimal_digits AS currencyDecimalDigits,
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
  phoneCountryCode: 'phone_country_code',
  phoneNumberLength: 'phone_number_length',
  currencySymbol: 'currency_symbol',
  currencyDecimalDigits: 'currency_decimal_digits',
};

export async function getWarehouse() {
  const [row] = await executeQuery(`SELECT ${WAREHOUSE_COLUMNS} FROM warehouse WHERE id = 1`);
  if (!row) throw new AppError(404, 'Warehouse settings have not been configured yet');
  return row;
}

/**
 * Public subset for unauthenticated screens — name (site title) plus the app-wide phone/currency
 * format settings, which must be readable without a session (e.g. the public storefront and the
 * register form both need to validate phone numbers against these before a session exists).
 * Never includes bank/address/contact details.
 */
export async function getPublicWarehouseInfo() {
  const [row] = await executeQuery(
    `SELECT name, phone_country_code AS phoneCountryCode, phone_number_length AS phoneNumberLength,
            currency_symbol AS currencySymbol, currency_decimal_digits AS currencyDecimalDigits
     FROM warehouse WHERE id = 1`,
  );
  return {
    name: row?.name ?? null,
    phoneCountryCode: row?.phoneCountryCode ?? '+91',
    phoneNumberLength: row?.phoneNumberLength ?? 10,
    currencySymbol: row?.currencySymbol ?? '₹',
    currencyDecimalDigits: row?.currencyDecimalDigits ?? 2,
  };
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
