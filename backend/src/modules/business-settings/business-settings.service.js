import { executeQuery } from '../../db/query.js';

const SETTINGS_COLUMNS = `
  business_id AS businessId, name, address, phone, email,
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

/** Values a freshly-created business (no `business_settings` row yet) reads back. */
function defaultSettings(businessId) {
  return {
    businessId,
    name: null,
    address: null,
    phone: null,
    email: null,
    bankName: null,
    accountHolderName: null,
    accountNumber: null,
    ifscCode: null,
    upiId: null,
    phoneCountryCode: '+91',
    phoneNumberLength: 10,
    currencySymbol: '₹',
    currencyDecimalDigits: 2,
  };
}

/**
 * Public phone/currency-format defaults for unauthenticated screens. Never hits the DB — the
 * storefront (which would need per-business context) is disabled, so a static default is enough.
 */
export function getPublicSettingsDefaults() {
  return {
    currencySymbol: '₹',
    currencyDecimalDigits: 2,
    phoneCountryCode: '+91',
    phoneNumberLength: 10,
  };
}

/** A business with no settings row yet reads back the default object rather than a 404. */
export async function getBusinessSettings(businessId) {
  const [row] = await executeQuery(
    `SELECT ${SETTINGS_COLUMNS} FROM business_settings WHERE business_id = ?`,
    [businessId],
  );
  return row ?? defaultSettings(businessId);
}

/** Upsert — creates the settings row on first write, merges into it thereafter. */
export async function updateBusinessSettings(businessId, input) {
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

  // `name` is NOT NULL with no column default — supply the business's own name on first insert.
  // An existing row keeps its stored name (not added to the ON DUPLICATE KEY UPDATE list).
  if (!columns.includes('name')) {
    const [business] = await executeQuery(`SELECT name FROM businesses WHERE id = ?`, [businessId]);
    columns.unshift('name');
    placeholders.unshift('?');
    params.unshift(business?.name ?? 'Business');
  }

  await executeQuery(
    `INSERT INTO business_settings (business_id, ${columns.join(', ')})
     VALUES (?, ${placeholders.join(', ')})
     ON DUPLICATE KEY UPDATE ${updates.join(', ')}`,
    [businessId, ...params],
  );

  return getBusinessSettings(businessId);
}
