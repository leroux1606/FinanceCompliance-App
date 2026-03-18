import * as XLSX from 'xlsx';
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
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { rows: [], headers: [] };

  const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const headers = rawHeaders.map(normalizeColumn);

  const rows: TrialBalanceRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string | number> = {};
    rawHeaders.forEach((h, idx) => {
      row[normalizeColumn(h)] = values[idx] ?? '';
    });

    const accountCode = String(row.accountCode ?? '').trim();
    const accountName = String(row.accountName ?? '').trim();
    if (!accountCode && !accountName) continue;

    rows.push({
      accountCode: accountCode || `ROW_${i}`,
      accountName: accountName || 'Unnamed',
      debit: parseNumber(row.debit as string | number),
      credit: parseNumber(row.credit as string | number),
    });
  }

  return { rows, headers };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      inQuotes = !inQuotes;
    } else if ((ch === ',' && !inQuotes) || ch === '\t') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseExcel(buffer: Buffer): { rows: TrialBalanceRow[]; headers: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][];

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
      debit: parseNumber(row[debitIdx] ?? 0),
      credit: parseNumber(row[creditIdx] ?? 0),
    });
  }

  return { rows, headers: rawHeaders };
}

export function validateColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const normalized = headers.map(normalizeColumn);
  const missing = REQUIRED_COLUMNS.filter((col) => !normalized.includes(col));
  return { valid: missing.length === 0, missing };
}
