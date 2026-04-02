import { describe, it, expect } from 'vitest';
import { generateIncomeStatement } from '../income-statement';
import type { TrialBalanceRow } from '../../compliance-engine/types';

function row(accountCode: string, accountName: string, debit: number, credit: number): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

// Balanced trial balance matching the seed data convention (uses "Cost of Goods Sold")
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

describe('generateIncomeStatement', () => {
  it('calculates revenue total from credit-balance accounts', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.revenueTotal).toBe(200000);
  });

  it('calculates COGS total from debit-balance accounts', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.cogsTotal).toBe(120000);
  });

  it('calculates gross profit correctly', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.grossProfit).toBe(80000); // 200000 - 120000
  });

  it('calculates operating expenses total', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    // Salaries 50000
    expect(is.opexTotal).toBe(50000);
  });

  it('calculates operating profit correctly', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.operatingProfit).toBe(30000); // 80000 - 50000
  });

  it('calculates profit before tax with no finance items', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.profitBeforeTax).toBe(30000);
  });

  it('calculates tax expense from income tax expense accounts', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.taxExpenseTotal).toBe(16000);
  });

  it('calculates net profit after tax', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    expect(is.netProfit).toBe(14000); // 30000 - 16000
  });

  it('handles finance income and costs', () => {
    const rows = [
      ...BASE_ROWS,
      row('2010', 'Interest Income', 0, 5000),
      row('2450', 'Interest Expense', 3000, 0),
    ];
    const is = generateIncomeStatement(rows);
    expect(is.financeIncomeTotal).toBe(5000);
    expect(is.financeCostsTotal).toBe(3000);
    expect(is.profitBeforeTax).toBe(32000); // 30000 + 5000 - 3000
  });

  it('reports a net loss when expenses exceed revenue', () => {
    const lossRows = [
      row('2000', 'Revenue / Sales', 0, 50000),
      row('2100', 'Cost of Goods Sold', 100000, 0),
    ];
    const is = generateIncomeStatement(lossRows);
    expect(is.grossProfit).toBe(-50000);
    expect(is.netProfit).toBeLessThan(0);
  });

  it('gross profit equals revenue when there is no COGS', () => {
    const rows = [row('2000', 'Revenue / Sales', 0, 100000)];
    const is = generateIncomeStatement(rows);
    expect(is.cogsTotal).toBe(0);
    expect(is.grossProfit).toBe(100000);
  });

  it('does not include current tax payable in tax expense', () => {
    const is = generateIncomeStatement(BASE_ROWS);
    // Current Tax Payable is a liability — should not appear in taxExpense
    const names = is.taxExpense.map((l) => l.accountName);
    expect(names).not.toContain('Current Tax Payable');
  });
});
