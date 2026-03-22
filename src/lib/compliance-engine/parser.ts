import * as XLSX from 'xlsx';
import { parse as parseCSVSync } from 'csv-parse/sync';
import type { TrialBalanceRow } from './types';

const REQUIRED_COLUMNS = ['accountCode', 'accountName', 'debit', 'credit'];
const COLUMN_ALIASES: Record<string, string> = {
  'account code': 'accountCode',
  'account_code': 'accountCode',
  'code': 'accountCode',
  'account name': 'accountName',
  'account_name': 'accountName',
  'name': 'accountName',
  'description': 'accountName',
  'debit': 'debit',
  'debits': 'debit',
  'credit': 'credit',
  'credits': 'credit',
};

function normalizeColumn(header: string): string {
  const trimmed = header.trim();
  const lower = trimmed.toLowerCase();
  return COLUMN_ALIASES[lower] ?? trimmed;
}

function parseNumber(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const cleaned = String(value)
    .replace(/[^\d.-]/g, '')
    .replace(/\s/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseCSV(content: string): { rows: TrialBalanceRow[]; headers: string[] } {
  // Use csv-parse for robust RFC 4180 handling (escaped quotes, quoted commas, etc.)
  const records = parseCSVSync(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  if (records.length === 0) return { rows: [], headers: [] };

  // Extract original header names from the first record's keys
  const rawHeaders = Object.keys(records[0]);
  const headers = rawHeaders.map(normalizeColumn);

  const rows: TrialBalanceRow[] = [];
  records.forEach((record, i) => {
    // Build a normalized key→value map
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(record)) {
      normalized[normalizeColumn(key)] = val;
    }

    const accountCode = (normalized.accountCode ?? '').trim();
    const accountName = (normalized.accountName ?? '').trim();
    if (!accountCode && !accountName) return;

    rows.push({
      accountCode: accountCode || `ROW_${i + 1}`,
      accountName: accountName || 'Unnamed',
      debit: parseNumber(normalized.debit ?? '0'),
      credit: parseNumber(normalized.credit ?? '0'),
    });
  });

  return { rows, headers };
}

export function parseExcel(buffer: Buffer): { rows: TrialBalanceRow[]; headers: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

  if (!data || data.length < 2) return { rows: [], headers: [] };

  const rawHeaders = (data[0] as string[]).map((h) => String(h ?? '').trim());
  const headerMap = rawHeaders.reduce((acc, h, idx) => {
    acc[normalizeColumn(h)] = idx;
    return acc;
  }, {} as Record<string, number>);

  const codeIdx = headerMap.accountCode ?? headerMap.code ?? 0;
  const nameIdx = headerMap.accountName ?? headerMap.name ?? 1;
  const debitIdx = headerMap.debit ?? 2;
  const creditIdx = headerMap.credit ?? 3;

  const rows: TrialBalanceRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row) continue;

    const accountCode = String(row[codeIdx] ?? '').trim();
    const accountName = String(row[nameIdx] ?? '').trim();
    if (!accountCode && !accountName) continue;

    rows.push({
      accountCode: accountCode || `ROW_${i}`,
      accountName: accountName || 'Unnamed',
      debit: parseNumber((row[debitIdx] as string | number) ?? 0),
      credit: parseNumber((row[creditIdx] as string | number) ?? 0),
    });
  }

  return { rows, headers: rawHeaders };
}

export function validateColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map(normalizeColumn);
  const missing = REQUIRED_COLUMNS.filter((col) => !normalized.includes(col));
  return { valid: missing.length === 0, missing };
}
