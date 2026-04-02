import { describe, it, expect } from 'vitest';
import { runComplianceChecks } from '../index';
import type { TrialBalanceRow } from '../types';

function row(accountCode: string, accountName: string, debit: number, credit: number): TrialBalanceRow {
  return { accountCode, accountName, debit, credit };
}

const SAMPLE_ROWS: TrialBalanceRow[] = [
  row('1000', 'Share Capital', 0, 500000),
  row('1100', 'Retained Earnings', 0, 125000),
  row('2000', 'Revenue / Sales', 0, 850000),
  row('2100', 'Cost of Goods Sold', 320000, 0),
  row('2200', 'Operating Expenses', 180000, 0),
  row('2300', 'Salaries and Wages', 150000, 0),
  row('2400', 'PAYE Payable', 0, 28500),
  row('3000', 'Trade Receivables (Debtors)', 95000, 0),
  row('3100', 'Trade Payables (Creditors)', 0, 45000),
  row('4000', 'Bank', 120000, 0),
  row('4100', 'Fixed Assets - PPE', 250000, 0),
  row('4200', 'Accumulated Depreciation', 0, 50000),
  row('5000', 'VAT Input', 28500, 0),
  row('5100', 'VAT Output', 0, 127500),
  row('6000', 'Income Tax Expense', 35000, 0),
  row('6100', 'Current Tax Payable', 0, 28000),
];

describe('runComplianceChecks (orchestrator)', () => {
  it('returns a summary with 12 check results', () => {
    const summary = runComplianceChecks(SAMPLE_ROWS);
    expect(summary.results).toHaveLength(12);
    expect(summary.totalChecks).toBe(12);
  });

  it('all check results have required fields', () => {
    const summary = runComplianceChecks(SAMPLE_ROWS);
    for (const r of summary.results) {
      expect(r).toHaveProperty('ruleCode');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('riskScore');
      expect(r).toHaveProperty('message');
      expect(['COMPLIANT', 'WARNING', 'HIGH_RISK']).toContain(r.status);
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
      expect(r.riskScore).toBeLessThanOrEqual(100);
    }
  });

  it('overallScore is between 0 and 100', () => {
    const summary = runComplianceChecks(SAMPLE_ROWS);
    expect(summary.overallScore).toBeGreaterThanOrEqual(0);
    expect(summary.overallScore).toBeLessThanOrEqual(100);
  });

  it('riskLevel is LOW|MEDIUM|HIGH', () => {
    const summary = runComplianceChecks(SAMPLE_ROWS);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(summary.riskLevel);
  });

  it('compliant + warnings + highRisk equals totalChecks', () => {
    const { compliant, warnings, highRisk, totalChecks } = runComplianceChecks(SAMPLE_ROWS);
    expect(compliant + warnings + highRisk).toBe(totalChecks);
  });

  it('returns HIGH riskLevel when trial balance does not balance', () => {
    const unbalanced = [
      row('1', 'Cash', 1000, 0),
      row('2', 'Capital', 0, 500), // 500 difference
    ];
    const summary = runComplianceChecks(unbalanced);
    expect(summary.riskLevel).toBe('HIGH');
  });

  it('handles empty rows without throwing', () => {
    expect(() => runComplianceChecks([])).not.toThrow();
    const summary = runComplianceChecks([]);
    expect(summary.results).toHaveLength(12);
  });

  it('all 12 rule codes are present in results', () => {
    const EXPECTED_CODES = [
      'TB_BALANCE',
      'REV_EXP_REASONABILITY',
      'MISSING_KEY_ACCOUNTS',
      'NEGATIVE_BALANCES',
      'COMPANIES_ACT_COMPLETENESS',
      'VAT_INDICATORS',
      'PAYE_CHECKS',
      'PROVISIONAL_TAX',
      'DUPLICATE_ENTRIES',
      'LARGE_VALUES',
      'BS_BALANCE',
      'IS_REVENUE_PRESENT',
    ];
    const summary = runComplianceChecks(SAMPLE_ROWS);
    const codes = summary.results.map((r) => r.ruleCode);
    for (const code of EXPECTED_CODES) {
      expect(codes).toContain(code);
    }
  });

  it('sample rows score is above 50 (good data should pass most checks)', () => {
    const summary = runComplianceChecks(SAMPLE_ROWS);
    expect(summary.overallScore).toBeGreaterThanOrEqual(50);
  });
});
