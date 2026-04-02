import { describe, it, expect } from 'vitest';
import { generateBalanceSheet } from '../balance-sheet';
import type { TrialBalanceRow } from '../../compliance-engine/types';

function row(accountCode: string, accountName: string, debit: number, credit: number): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

// Balanced trial balance — net profit is 14000 (matches income-statement.test.ts)
const BASE_ROWS: TrialBalanceRow[] = [
  row('1000', 'Share Capital', 0, 100000),
  row('1100', 'Retained Earnings', 0, 50000),
  row('2000', 'Revenue / Sales', 0, 200000),
  row('2100', 'Cost of Goods Sold', 120000, 0),
  row('2300', 'Salaries and Wages', 50000, 0),
  row('2400', 'PAYE Payable', 0, 8000),
  row('3000', 'Trade Receivables (Debtors)', 80000, 0),
  row('3100', 'Trade Payables (Creditors)', 0, 30000),
  row('3200', 'Inventory', 46000, 0),
  row('4000', 'Bank', 50000, 0),
  row('4100', 'Fixed Assets - PPE', 100000, 0),
  row('4200', 'Accumulated Depreciation', 0, 20000),
  row('5000', 'VAT Input', 10000, 0),
  row('5100', 'VAT Output', 0, 50000),
  row('6000', 'Income Tax Expense', 16000, 0),
  row('6100', 'Current Tax Payable', 0, 14000),
];

const NET_PROFIT = 14000;

describe('generateBalanceSheet', () => {
  it('includes "Profit for the Period" in equity', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    const profitLine = bs.equity.find((l) => l.accountName === 'Profit for the Period');
    expect(profitLine).toBeDefined();
    expect(profitLine!.amount).toBe(NET_PROFIT);
  });

  it('accumulated depreciation reduces non-current assets total', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    // PPE 100000, AccDep credit 20000 → net non-current assets = 80000
    expect(bs.nonCurrentAssetsTotal).toBe(80000);
  });

  it('groups cash (bank) into current assets', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    const bankLine = bs.currentAssets.find((l) => l.accountName === 'Bank');
    expect(bankLine).toBeDefined();
    expect(bankLine!.amount).toBe(50000);
  });

  it('calculates total assets', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    // Non-current: 80000, Current: Receivables 80000 + Inventory 46000 + VAT Input 10000 + Bank 50000 = 186000
    expect(bs.totalAssets).toBe(80000 + 186000);
  });

  it('calculates equity total including net profit', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    // Share Capital 100000 + Retained Earnings 50000 + Profit 14000 = 164000
    expect(bs.equityTotal).toBe(164000);
  });

  it('classifies PAYE and VAT Output as current liabilities', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    const names = bs.currentLiabilities.map((l) => l.accountName);
    expect(names).toContain('PAYE Payable');
    expect(names).toContain('VAT Output');
  });

  it('classifies current tax payable as a current liability', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    const names = bs.currentLiabilities.map((l) => l.accountName);
    expect(names).toContain('Current Tax Payable');
  });

  it('balance sheet balances for a proper trial balance', () => {
    const bs = generateBalanceSheet(BASE_ROWS, NET_PROFIT);
    expect(bs.isBalanced).toBe(true);
    expect(bs.difference).toBeLessThanOrEqual(0.01);
  });

  it('flags isBalanced = false when assets do not equal equity + liabilities', () => {
    // Remove an asset to create imbalance
    const unbalancedRows = BASE_ROWS.filter((r) => r.accountName !== 'Inventory');
    const bs = generateBalanceSheet(unbalancedRows, NET_PROFIT);
    expect(bs.isBalanced).toBe(false);
    expect(bs.difference).toBeGreaterThan(0);
  });

  it('handles a net loss (negative netProfit)', () => {
    const bs = generateBalanceSheet(BASE_ROWS, -10000);
    const profitLine = bs.equity.find((l) => l.accountName === 'Profit for the Period');
    expect(profitLine!.amount).toBe(-10000);
    // Equity should be reduced
    expect(bs.equityTotal).toBe(100000 + 50000 - 10000);
  });
});
