import { describe, it, expect } from 'vitest';
import { classifyAccounts } from '../classifier';
import type { TrialBalanceRow } from '../../compliance-engine/types';

function row(accountCode: string, accountName: string, debit = 0, credit = 0): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

describe('classifyAccounts', () => {
  it('classifies revenue accounts', () => {
    const [r] = classifyAccounts([row('2000', 'Revenue / Sales', 0, 200000)]);
    expect(r.category).toBe('REVENUE');
  });

  it('classifies cost of goods sold', () => {
    const [r] = classifyAccounts([row('2100', 'Cost of Goods Sold', 120000, 0)]);
    expect(r.category).toBe('COGS');
  });

  it('classifies operating expenses', () => {
    const [r] = classifyAccounts([row('2300', 'Salaries and Wages', 50000, 0)]);
    expect(r.category).toBe('OPEX');
  });

  it('classifies depreciation as OPEX', () => {
    const [r] = classifyAccounts([row('2350', 'Depreciation Expense', 10000, 0)]);
    expect(r.category).toBe('OPEX');
  });

  it('classifies income tax expense as TAX_EXPENSE', () => {
    const [r] = classifyAccounts([row('6000', 'Income Tax Expense', 16000, 0)]);
    expect(r.category).toBe('TAX_EXPENSE');
  });

  it('classifies current tax payable as CURRENT_LIABILITY (not TAX_EXPENSE)', () => {
    const [r] = classifyAccounts([row('6100', 'Current Tax Payable', 0, 14000)]);
    expect(r.category).toBe('CURRENT_LIABILITY');
  });

  it('classifies bank as CASH', () => {
    const [r] = classifyAccounts([row('4000', 'Bank', 50000, 0)]);
    expect(r.category).toBe('CASH');
  });

  it('classifies cash and cash equivalents as CASH', () => {
    const [r] = classifyAccounts([row('4010', 'Cash and Cash Equivalents', 5000, 0)]);
    expect(r.category).toBe('CASH');
  });

  it('classifies fixed assets as NON_CURRENT_ASSET', () => {
    const [r] = classifyAccounts([row('4100', 'Fixed Assets - PPE', 100000, 0)]);
    expect(r.category).toBe('NON_CURRENT_ASSET');
  });

  it('classifies accumulated depreciation as NON_CURRENT_ASSET', () => {
    const [r] = classifyAccounts([row('4200', 'Accumulated Depreciation', 0, 20000)]);
    expect(r.category).toBe('NON_CURRENT_ASSET');
  });

  it('classifies trade receivables as CURRENT_ASSET', () => {
    const [r] = classifyAccounts([row('3000', 'Trade Receivables (Debtors)', 80000, 0)]);
    expect(r.category).toBe('CURRENT_ASSET');
  });

  it('classifies VAT Input as CURRENT_ASSET', () => {
    const [r] = classifyAccounts([row('5000', 'VAT Input', 10000, 0)]);
    expect(r.category).toBe('CURRENT_ASSET');
  });

  it('classifies share capital as EQUITY', () => {
    const [r] = classifyAccounts([row('1000', 'Share Capital', 0, 100000)]);
    expect(r.category).toBe('EQUITY');
  });

  it('classifies retained earnings as EQUITY', () => {
    const [r] = classifyAccounts([row('1100', 'Retained Earnings', 0, 50000)]);
    expect(r.category).toBe('EQUITY');
  });

  it('classifies trade payables as CURRENT_LIABILITY', () => {
    const [r] = classifyAccounts([row('3100', 'Trade Payables (Creditors)', 0, 30000)]);
    expect(r.category).toBe('CURRENT_LIABILITY');
  });

  it('classifies VAT Output as CURRENT_LIABILITY', () => {
    const [r] = classifyAccounts([row('5100', 'VAT Output', 0, 50000)]);
    expect(r.category).toBe('CURRENT_LIABILITY');
  });

  it('classifies PAYE payable as CURRENT_LIABILITY', () => {
    const [r] = classifyAccounts([row('2400', 'PAYE Payable', 0, 8000)]);
    expect(r.category).toBe('CURRENT_LIABILITY');
  });

  it('classifies interest income as FINANCE_INCOME', () => {
    const [r] = classifyAccounts([row('2010', 'Interest Income', 0, 5000)]);
    expect(r.category).toBe('FINANCE_INCOME');
  });

  it('classifies interest expense as FINANCE_COST', () => {
    const [r] = classifyAccounts([row('2450', 'Interest Expense', 3000, 0)]);
    expect(r.category).toBe('FINANCE_COST');
  });

  it('classifies inventory as CURRENT_ASSET', () => {
    const [r] = classifyAccounts([row('3200', 'Inventory', 46000, 0)]);
    expect(r.category).toBe('CURRENT_ASSET');
  });

  it('returns UNCLASSIFIED for unknown accounts', () => {
    const [r] = classifyAccounts([row('9999', 'Suspense Account', 1000, 0)]);
    expect(r.category).toBe('UNCLASSIFIED');
  });
});
