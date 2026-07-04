import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { AppError } from '../middleware/errorHandler.js';

/** Converts one ExcelJS cell into a plain JS value — Date stays a Date, numbers stay numbers. */
function cellValue(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim(); // rich text
  if (typeof value === 'object' && 'result' in value) return value.result ?? ''; // formula cell
  if (typeof value === 'string') return value.trim();
  return value;
}

/**
 * Parses an uploaded .xlsx or .csv buffer into row objects keyed by the first row's header
 * names, e.g. [{ rowNumber: 2, data: { Product: 'X', Mrp: 100, ... } }]. Row 1 is always
 * treated as the header row. Blank rows are skipped. Callers own all field-level validation —
 * this only does the shared "read the sheet" step.
 */
export async function parseRowsFromFile(buffer, originalName) {
  const extension = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  const workbook = new ExcelJS.Workbook();

  let worksheet;
  if (extension === '.csv') {
    worksheet = await workbook.csv.read(Readable.from(buffer));
  } else if (extension === '.xlsx') {
    await workbook.xlsx.load(buffer);
    [worksheet] = workbook.worksheets;
  } else {
    throw new AppError(400, 'Only .xlsx or .csv files are supported');
  }

  if (!worksheet || worksheet.rowCount < 2) {
    throw new AppError(400, 'File has no data rows');
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const data = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value = cellValue(cell);
      if (value !== '') hasValue = true;
      data[header] = value;
    });
    if (hasValue) rows.push({ rowNumber, data });
  }
  return rows;
}
