const fs = require('fs');
const fsp = require('fs/promises');
const { Readable } = require('stream');
const { parse } = require('csv-parse');

const REQUIRED_COLUMNS = ['saleOrderId', 'customerName', 'customerPhone', 'customerAddress'];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, 'packageDetails'];

/**
 * Normalises a raw CSV header to its camelCase field name.
 * Accepts variants like "sale_order_id", "Sale Order Id", "saleOrderId".
 */
function normaliseHeader(raw) {
  const lower = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const MAP = {
    saleorderid: 'saleOrderId',
    customername: 'customerName',
    customerphone: 'customerPhone',
    customeraddress: 'customerAddress',
    packagedetails: 'packageDetails',
  };
  return MAP[lower] || raw.trim();
}

/**
 * Parses a CSV file into an array of row objects.
 * Returns { rows, headers } where rows[i] = { saleOrderId, customerName, ... }
 */
function parseCSVStream(inputStream) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = inputStream.pipe(
      parse({
        columns: (headers) => headers.map(normaliseHeader),
        skip_empty_lines: true,
        trim: true,
        bom: true,
      })
    );

    stream.on('data', (row) => rows.push(row));
    stream.on('error', reject);
    stream.on('end', () => resolve(rows));
  });
}

function parseCSV(filePath) {
  return parseCSVStream(fs.createReadStream(filePath));
}

function parseCSVBuffer(buffer) {
  return parseCSVStream(Readable.from(buffer));
}

/**
 * Validates a single parsed row. Returns null if valid, or an error string.
 */
function validateRow(row) {
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col] || String(row[col]).trim().length === 0) {
      return `Missing required field: ${col}`;
    }
  }

  const phone = String(row.customerPhone).trim();
  if (phone.length < 7 || phone.length > 20) {
    return `customerPhone must be between 7 and 20 characters`;
  }

  if (String(row.customerName).trim().length > 200) {
    return `customerName exceeds 200 characters`;
  }

  if (String(row.customerAddress).trim().length > 500) {
    return `customerAddress exceeds 500 characters`;
  }

  return null;
}

/**
 * Writes failed rows + reason to an error CSV file.
 * Each entry in failedRows: { row: { ...csvFields }, reason: string, rowNumber: number }
 */
async function generateErrorCSV(failedRows, outputPath) {
  const body = buildErrorCSV(failedRows);
  await fsp.writeFile(outputPath, body, 'utf-8');
}

function buildErrorCSV(failedRows) {
  const header = ['rowNumber', ...ALL_COLUMNS, 'errorReason'];
  const lines = [header.join(',')];

  for (const { row, reason, rowNumber } of failedRows) {
    const values = [
      rowNumber,
      ...ALL_COLUMNS.map((col) => escapeCSV(row[col] || '')),
      escapeCSV(reason),
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function escapeCSV(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const SAMPLE_CSV_FILE_NAME = 'nexus-orders-upload-sample.csv';

/**
 * A minimal CSV the worker accepts: same headers the parser normalizes (camelCase).
 * UTF-8 BOM helps Excel on Windows show the file correctly.
 */
function getSampleUploadCsv() {
  const sample = {
    saleOrderId: 'SO-10001',
    customerName: 'Acme Customer',
    customerPhone: '+15551234567',
    customerAddress: '123 Main St, Springfield, ST 12345',
    packageDetails: 'Standard box, 2kg',
  };

  const header = ALL_COLUMNS.join(',');
  const row = ALL_COLUMNS.map((col) => escapeCSV(sample[col] || ''));
  return `\uFEFF${header}\n${row.join(',')}`;
}

module.exports = {
  parseCSV,
  parseCSVBuffer,
  validateRow,
  generateErrorCSV,
  buildErrorCSV,
  getSampleUploadCsv,
  SAMPLE_CSV_FILE_NAME,
  REQUIRED_COLUMNS,
  ALL_COLUMNS,
};
