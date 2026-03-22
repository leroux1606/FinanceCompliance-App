import { describe, it, expect } from 'vitest';
import { parseCSV, validateColumns } from '../parser';

// ─── parseCSV ──────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('parses a standard CSV correctly', () => {
    const csv = `accountCode,accountName,debit,credit
1000,Bank,100,0
2000,Revenue,0,100`;
    const { rows, headers } = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].accountCode).toBe('1000');
    expect(rows[0].accountName).toBe('Bank');
    expect(rows[0].debit).toBe(100);
    expect(rows[0].credit).toBe(0);
    expect(headers).toContain('accountCode');
  });

  it('handles quoted fields containing commas', () => {
    const csv = `accountCode,accountName,debit,credit
1000,"Smith, Jones & Partners",5000,0
2000,Revenue,0,5000`;
    const { rows } = parseCSV(csv);
    expect(rows[0].accountName).toBe('Smith, Jones & Partners');
  });

  it('handles RFC 4180 escaped double quotes in fields', () => {
    const csv = `accountCode,accountName,debit,credit
1000,"Account ""Special Notes""",1000,0
2000,Revenue,0,1000`;
    const { rows } = parseCSV(csv);
    expect(rows[0].accountName).toBe('Account "Special Notes"');
  });

  it('returns empty rows for content with only a header', () => {
    const csv = 'accountCode,accountName,debit,credit';
    const { rows } = parseCSV(csv);
    expect(rows).toHaveLength(0);
  });

  it('skips rows with no accountCode and no accountName', () => {
    const csv = `accountCode,accountName,debit,credit
,  ,100,0
1000,Bank,100,0`;
    const { rows } = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountCode).toBe('1000');
  });

  it('handles column aliases: code, name, debits, credits', () => {
    const csv = `code,name,debits,credits
1000,Bank,100,0`;
    const { rows } = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].accountCode).toBe('1000');
    expect(rows[0].debit).toBe(100);
  });

  it('handles column alias: description instead of name', () => {
    const csv = `accountCode,description,debit,credit
1000,Bank Account,100,0`;
    const { rows } = parseCSV(csv);
    expect(rows[0].accountName).toBe('Bank Account');
  });

  it('handles numeric values with spaces and R prefix', () => {
    const csv = `accountCode,accountName,debit,credit
1000,Bank,"R 1,234.50",0`;
    const { rows } = parseCSV(csv);
    expect(rows[0].debit).toBeCloseTo(1234.5);
  });

  it('returns 0 for empty numeric cells', () => {
    const csv = `accountCode,accountName,debit,credit
1000,Bank,,`;
    const { rows } = parseCSV(csv);
    expect(rows[0].debit).toBe(0);
    expect(rows[0].credit).toBe(0);
  });

  it('returns empty result for empty string', () => {
    const { rows, headers } = parseCSV('');
    expect(rows).toHaveLength(0);
    expect(headers).toHaveLength(0);
  });

  it('uses ROW_N fallback when accountCode is missing', () => {
    const csv = `accountCode,accountName,debit,credit
,Bank Account,100,0`;
    const { rows } = parseCSV(csv);
    expect(rows[0].accountCode).toMatch(/^ROW_/);
  });
});

// ─── validateColumns ───────────────────────────────────────────────────────────

describe('validateColumns', () => {
  it('returns valid for correct headers', () => {
    const result = validateColumns(['accountCode', 'accountName', 'debit', 'credit']);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('returns invalid and lists missing columns', () => {
    const result = validateColumns(['accountCode', 'accountName']);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('debit');
    expect(result.missing).toContain('credit');
  });

  it('accepts alias headers (code, name, debits, credits)', () => {
    const result = validateColumns(['code', 'name', 'debits', 'credits']);
    expect(result.valid).toBe(true);
  });

  it('returns all 4 as missing for empty headers', () => {
    const result = validateColumns([]);
    expect(result.missing).toHaveLength(4);
  });
});
