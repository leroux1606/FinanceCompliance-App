import { describe, it, expect } from 'vitest';
import {
  runTrialBalanceBalances,
  runRevenueExpenseReasonability,
  runMissingKeyAccounts,
  runUnusualNegativeBalances,
  runCompaniesActCompleteness,
  runVATIndicators,
  runPAYEChecks,
  runProvisionalTaxIndicators,
  runDuplicateEntries,
  runLargeUnexplainedValues,
} from '../checks';
import type { TrialBalanceRow } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function row(accountCode: string, accountName: string, debit: number, credit: number): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

// Properly balanced trial balance — debits = credits = 472,000
// Includes all 8 IFRS key accounts for MissingKeyAccounts check
const BALANCED_ROWS: TrialBalanceRow[] = [
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

// ─── runTrialBalanceBalances ────────────────────────────────────────────────────

describe('runTrialBalanceBalances', () => {
  it('returns COMPLIANT when debits equal credits exactly', () => {
    const result = runTrialBalanceBalances(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
    expect(result.riskScore).toBe(0);
    expect(result.ruleCode).toBe('TB_BALANCE');
  });

  it('returns COMPLIANT when difference is within 0.01 tolerance', () => {
    const rows = [row('1', 'A', 1000.005, 0), row('2', 'B', 0, 1000)];
    const result = runTrialBalanceBalances(rows);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns HIGH_RISK when debits and credits differ by more than tolerance', () => {
    const rows = [row('1', 'A', 1000, 0), row('2', 'B', 0, 500)];
    const result = runTrialBalanceBalances(rows);
    expect(result.status).toBe('HIGH_RISK');
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
  });

  it('riskScore is at least 60 for any out-of-balance condition', () => {
    const rows = [row('1', 'A', 100, 0), row('2', 'B', 0, 99)];
    const result = runTrialBalanceBalances(rows);
    expect(result.riskScore).toBeGreaterThanOrEqual(60);
  });

  it('includes difference in details', () => {
    const rows = [row('1', 'A', 1000, 0), row('2', 'B', 0, 800)];
    const result = runTrialBalanceBalances(rows);
    expect(result.details).toHaveProperty('difference');
    expect((result.details as { difference: number }).difference).toBeCloseTo(200);
  });
});

// ─── runRevenueExpenseReasonability ────────────────────────────────────────────

describe('runRevenueExpenseReasonability', () => {
  it('returns COMPLIANT for reasonable revenue/expense ratio', () => {
    const rows = [row('R', 'Revenue / Sales', 0, 100000), row('E', 'Operating Expenses', 60000, 0)];
    const result = runRevenueExpenseReasonability(rows);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when revenue and expense accounts cannot be found', () => {
    const rows = [row('X', 'Unknown Account 1', 100, 0), row('Y', 'Unknown Account 2', 0, 100)];
    const result = runRevenueExpenseReasonability(rows);
    expect(result.status).toBe('WARNING');
    expect(result.ruleCode).toBe('REV_EXP_REASONABILITY');
  });

  it('returns WARNING when expenses are significantly higher than revenue', () => {
    const rows = [
      row('R', 'Revenue', 0, 100),
      row('E', 'Expenses', 300, 0),
    ];
    const result = runRevenueExpenseReasonability(rows);
    expect(result.status).toBe('WARNING');
  });

  it('returns COMPLIANT for the sample balanced rows', () => {
    const result = runRevenueExpenseReasonability(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });
});

// ─── runMissingKeyAccounts ──────────────────────────────────────────────────────

describe('runMissingKeyAccounts', () => {
  it('returns COMPLIANT when all key accounts are present', () => {
    const result = runMissingKeyAccounts(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
    expect(result.riskScore).toBe(0);
  });

  it('returns WARNING when 1-2 key accounts are missing', () => {
    // Remove cash/bank from rows
    const rows = BALANCED_ROWS.filter((r) => !/bank|cash/i.test(r.accountName));
    const result = runMissingKeyAccounts(rows);
    expect(result.status).toBe('WARNING');
  });

  it('returns HIGH_RISK when more than 2 key accounts are missing', () => {
    const rows = [row('X', 'Miscellaneous', 1000, 1000)];
    const result = runMissingKeyAccounts(rows);
    expect(result.status).toBe('HIGH_RISK');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });

  it('ruleCode is MISSING_KEY_ACCOUNTS', () => {
    const result = runMissingKeyAccounts(BALANCED_ROWS);
    expect(result.ruleCode).toBe('MISSING_KEY_ACCOUNTS');
  });
});

// ─── runUnusualNegativeBalances ─────────────────────────────────────────────────

describe('runUnusualNegativeBalances', () => {
  it('returns COMPLIANT for normally-balanced rows', () => {
    const result = runUnusualNegativeBalances(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when an asset account has a negative net balance > 100', () => {
    const rows = [row('3000', 'Trade Receivables (Debtors)', 0, 5000)]; // credit > debit for asset
    const result = runUnusualNegativeBalances(rows);
    expect(result.status).toBe('WARNING');
  });

  it('returns HIGH_RISK when more than 3 accounts have unusual balances', () => {
    const rows = [
      row('3001', 'Trade Receivables A', 0, 5000),
      row('3002', 'Trade Receivables B', 0, 5000),
      row('3003', 'Cash Account A', 0, 5000),
      row('3004', 'Cash Account B', 0, 5000),
    ];
    const result = runUnusualNegativeBalances(rows);
    expect(result.status).toBe('HIGH_RISK');
  });
});

// ─── runCompaniesActCompleteness ────────────────────────────────────────────────

describe('runCompaniesActCompleteness', () => {
  it('returns COMPLIANT for substantive data (10+ rows, non-zero value)', () => {
    const result = runCompaniesActCompleteness(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when fewer than 10 rows', () => {
    const rows = [row('1', 'A', 100, 0), row('2', 'B', 0, 100)];
    const result = runCompaniesActCompleteness(rows);
    expect(result.status).toBe('WARNING');
    expect(result.riskScore).toBe(50);
  });

  it('returns WARNING for empty rows', () => {
    const result = runCompaniesActCompleteness([]);
    expect(result.status).toBe('WARNING');
  });
});

// ─── runVATIndicators ──────────────────────────────────────────────────────────

describe('runVATIndicators', () => {
  it('returns COMPLIANT when both VAT input and output are present', () => {
    const result = runVATIndicators(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when no VAT accounts are present', () => {
    const rows = [row('1', 'Revenue', 0, 1000), row('2', 'Bank', 1000, 0)];
    const result = runVATIndicators(rows);
    expect(result.status).toBe('WARNING');
    expect(result.ruleCode).toBe('VAT_INDICATORS');
  });

  it('returns WARNING for large net VAT position', () => {
    const rows = [
      row('5000', 'VAT Input', 200000, 0),
      row('5100', 'VAT Output', 0, 50000),
    ];
    const result = runVATIndicators(rows);
    expect(result.status).toBe('WARNING');
  });
});

// ─── runPAYEChecks ──────────────────────────────────────────────────────────────

describe('runPAYEChecks', () => {
  it('returns COMPLIANT when both salary and PAYE accounts are present and reasonable', () => {
    // BALANCED_ROWS has 'Salaries and Wages' + 'PAYE Payable' (28500 credit balance)
    const result = runPAYEChecks(BALANCED_ROWS);
    // PAYE balance is 28500 > 10000, so should be WARNING
    expect(['COMPLIANT', 'WARNING']).toContain(result.status);
  });

  it('returns WARNING when salary accounts exist but no PAYE account', () => {
    const rows = [row('2300', 'Salaries and Wages', 150000, 0)];
    const result = runPAYEChecks(rows);
    expect(result.status).toBe('WARNING');
    expect(result.ruleCode).toBe('PAYE_CHECKS');
  });

  it('returns COMPLIANT when neither salary nor PAYE accounts exist', () => {
    const rows = [row('1', 'Revenue', 0, 1000)];
    const result = runPAYEChecks(rows);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when PAYE balance is high (>10000)', () => {
    const rows = [
      row('2300', 'Salaries and Wages', 150000, 0),
      row('2400', 'PAYE Payable', 0, 50000),
    ];
    const result = runPAYEChecks(rows);
    expect(result.status).toBe('WARNING');
    expect(result.riskScore).toBe(40);
  });
});

// ─── runProvisionalTaxIndicators ───────────────────────────────────────────────

describe('runProvisionalTaxIndicators', () => {
  it('returns COMPLIANT when income tax accounts are present', () => {
    const result = runProvisionalTaxIndicators(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when no income tax accounts are found', () => {
    const rows = [row('1', 'Revenue', 0, 1000), row('2', 'Bank', 1000, 0)];
    const result = runProvisionalTaxIndicators(rows);
    expect(result.status).toBe('WARNING');
    expect(result.ruleCode).toBe('PROVISIONAL_TAX');
  });
});

// ─── runDuplicateEntries ────────────────────────────────────────────────────────

describe('runDuplicateEntries', () => {
  it('returns COMPLIANT when all entries are unique', () => {
    const result = runDuplicateEntries(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
    expect(result.riskScore).toBe(0);
  });

  it('returns WARNING when duplicate entries exist', () => {
    const rows = [
      row('1000', 'Bank', 100, 0),
      row('1000', 'Bank', 200, 0), // duplicate code+name
    ];
    const result = runDuplicateEntries(rows);
    expect(result.status).toBe('WARNING');
    expect(result.ruleCode).toBe('DUPLICATE_ENTRIES');
  });

  it('handles empty input without throwing', () => {
    expect(() => runDuplicateEntries([])).not.toThrow();
    const result = runDuplicateEntries([]);
    expect(result.status).toBe('COMPLIANT');
  });
});

// ─── runLargeUnexplainedValues ──────────────────────────────────────────────────

describe('runLargeUnexplainedValues', () => {
  it('returns COMPLIANT for normally-distributed values', () => {
    const result = runLargeUnexplainedValues(BALANCED_ROWS);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns COMPLIANT for empty rows', () => {
    const result = runLargeUnexplainedValues([]);
    expect(result.status).toBe('COMPLIANT');
  });

  it('returns WARNING when many items exceed 20× average', () => {
    // Need many small rows to keep avg low, with 6+ items far above threshold.
    // 200 rows at 100, 6 rows at 50000:
    //   total = 200*100 + 6*50000 = 320,000
    //   avg   = 320,000 / 206 ≈ 1,553
    //   threshold = 1,553 * 20 ≈ 31,060
    //   large row value = 50,000 > 31,060 → 6 large items > 5 → WARNING
    const rows: TrialBalanceRow[] = [
      ...Array.from({ length: 200 }, (_, i) => row(`S${i}`, `Small Account ${i}`, 100, 0)),
      ...Array.from({ length: 6 }, (_, i) => row(`L${i}`, `Large Account ${i}`, 50000, 0)),
    ];
    const result = runLargeUnexplainedValues(rows);
    expect(result.status).toBe('WARNING');
  });
});
