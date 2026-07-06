import fs from 'fs';

/**
 * Minimal RFC4180 CSV parser (handles quoted fields, embedded commas/quotes/newlines,
 * CRLF/LF line endings) built for one reason: ExcelJS's CSV reader — used by the
 * interactive stock import (utils/importFile.js) — took 200–280 seconds to parse a single
 * ~50,000-row file in testing. This parser does the same job in well under a second,
 * which is the difference between the bulk import script finishing in minutes vs. hours.
 * It is intentionally CSV-only (no .xlsx) — that's the only format these legacy exports
 * come in, and staying single-purpose is what makes it fast.
 *
 * Returns rows shaped like `utils/importFile.js`'s parseRowsFromFile — `{ rowNumber, data }`
 * objects keyed by the header row — so downstream code (parseStockRow) doesn't care which
 * parser produced them.
 */
export function parseCsvFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf-8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip a UTF-8 BOM if present

  const rawRows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); field = ''; rawRows.push(row); row = []; continue; }
    field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rawRows.push(row); }

  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map((h) => h.trim());
  const rows = [];
  for (let r = 1; r < rawRows.length; r += 1) {
    const cols = rawRows[r];
    if (cols.length === 1 && cols[0].trim() === '') continue; // trailing blank line
    const data = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c += 1) {
      const header = headers[c];
      if (!header) continue;
      const value = (cols[c] ?? '').trim();
      if (value !== '') hasValue = true;
      data[header] = value;
    }
    if (hasValue) rows.push({ rowNumber: r + 1, data });
  }
  return rows;
}
