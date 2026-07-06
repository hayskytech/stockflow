// Pure row-parsing/validation helpers shared between the interactive stock import
// (stock.service.js, for small ad-hoc .xlsx/.csv uploads) and the one-time bulk CSV
// import script (scripts/import-stock-csv.js, for large legacy-data files) — kept in
// one place so both paths validate a row identically.

const MONTH_NAMES = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parses "1"/"1,200"/1200 into a non-negative number, or null if invalid. */
export function parseMoney(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Accepts a real Date (from an .xlsx date cell) or the client software's "DD-MMM-YY" text format. */
export function parseInvoiceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = MONTH_NAMES[match[2].toLowerCase()];
      let year = parseInt(match[3], 10);
      if (year < 100) year += year < 70 ? 2000 : 1900;
      if (month !== undefined) {
        const date = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
  }
  return null;
}

export function toDateOnly(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Case/whitespace-insensitive key for matching a (product name, category name) pair. */
export function pairKey(product, subGroup) {
  return `${product.trim().toLowerCase()} ${subGroup.trim().toLowerCase()}`;
}

/**
 * Validates and normalizes one raw stock-import row (shared shape used by both import
 * paths: columns Product, ProductSubGroup, Mrp, InvoiceNo, WSalePrice, Barcode,
 * InvoiceDate, Size, Note — Itemcode is ignored). Returns `{ row, warning }` on success
 * or `{ error }` on failure; never throws, so callers can accumulate results across
 * thousands of rows without try/catch per row.
 */
export function parseStockRow(rowNumber, data) {
  const product = String(data.Product ?? '').trim();
  const subGroup = String(data.ProductSubGroup ?? '').trim();
  const barcode = String(data.Barcode ?? '').trim();
  const invoiceNo = String(data.InvoiceNo ?? '').trim();

  if (!product || !subGroup || !barcode || !invoiceNo) {
    return { error: `Row ${rowNumber}: Product, ProductSubGroup, Barcode and InvoiceNo are required` };
  }

  const mrp = parseMoney(data.Mrp);
  if (mrp === null) return { error: `Row ${rowNumber}: Mrp must be a number ≥ 0` };

  const wsp = parseMoney(data.WSalePrice);
  if (wsp === null) return { error: `Row ${rowNumber}: WSalePrice must be a number ≥ 0` };

  if (wsp > mrp) return { error: `Row ${rowNumber}: WSalePrice cannot be greater than Mrp` };

  const invoiceDate = parseInvoiceDate(data.InvoiceDate);
  const warning =
    data.InvoiceDate && !invoiceDate
      ? `Row ${rowNumber}: could not parse InvoiceDate "${data.InvoiceDate}" — saved without a date`
      : null;

  return {
    row: {
      rowNumber,
      product,
      subGroup,
      barcode,
      invoiceNo,
      mrp,
      wsp,
      size: String(data.Size ?? '').trim() || null,
      note: String(data.Note ?? '').trim() || null,
      invoiceDate: toDateOnly(invoiceDate),
    },
    warning,
  };
}
