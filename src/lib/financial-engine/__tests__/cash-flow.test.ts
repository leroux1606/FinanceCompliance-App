import { describe, it, expect } from 'vitest';
import { generateCashFlow } from '../cash-flow';
import { generateIncomeStatement } from '../income-statement';
import type { TrialBalanceRow } from '../../compliance-engine/types';

function row(accountCode: string, accountName: string, debit: number, credit: number): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

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

describe('generateCashFlow', () => {
  it('closing cash equals the bank account balance', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    const cf = generateCashFlow(BASE_ROWS, is);
    expect(cf.closingCash).toBe(50000);
  });

  it('opening cash is 0 (not determinable from single period)', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    const cf = generateCashFlow(BASE_ROWS, is);
    expect(cf.openingCash).toBe(0);
  });

  it('net profit matches income statement net profit', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    const cf = generateCashFlow(BASE_ROWS, is);
    expect(cf.netProfit).toBe(is.netProfit);
  });

  it('adds back depreciation as a non-cash adjustment', () => {
    const rows = [
      ...BASE_ROWS,
      row('2350', 'Depreciation Expense', 10000, 0),
    ];
    const is = generateIncomeStatement(rows);
    const cf = generateCashFlow(rows, is);
    const depreciationItem = cf.nonCashAdjustments.find((i) => i.label.includes('Depreciation'));
    expect(depreciationItem).toBeDefined();
    expect(depreciationItem!.amount).toBe(10000);
  });

  it('non-cash adjustments total is 0 when no depreciation accounts exist', () => {
    const rowsWithoutDep = BASE_ROWS.filter((r) => !r.accountName.includes('Depreciation'));
    const is = generateIncomeStatement(rowsWithoutDep);
    const cf = generateCashFlow(rowsWithoutDep, is);
    expect(cf.nonCashAdjustmentsTotal).toBe(0);
  });

  it('operating activities subtotal = net profit + non-cash adjustments', () => {
    const rows = [
      ...BASE_ROWS,
      row('2350', 'Depreciation Expense', 10000, 0),
    ];
    const is = generateIncomeStatement(rows);
    const cf = generateCashFlow(rows, is);
    expect(cf.operatingActivitiesSubtotal).toBe(cf.netProfit + cf.nonCashAdjustmentsTotal);
  });

  it('always sets requiresComparativeNote to true', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    const cf = generateCashFlow(BASE_ROWS, is);
    expect(cf.requiresComparativeNote).toBe(true);
  });

  it('includes a workingCapitalNote explaining the limitation', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    const cf = generateCashFlow(BASE_ROWS, is);
    expect(cf.workingCapitalNote).toBeTruthy();
    expect(cf.workingCapitalNote.length).toBeGreaterThan(20);
  });

  it('closing cash reflects multiple bank/cash accounts', () => {
    const rows = [
      row('4000', 'Bank', 30000, 0),
      row('4010', 'Petty Cash', 2000, 0),
    ];
    const is = generateIncomeStatement(rows);
    const cf = generateCashFlow(rows, is);
    expect(cf.closingCash).toBe(32000);
  });
});
