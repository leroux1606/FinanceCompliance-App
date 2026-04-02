import type { TrialBalanceRow, CheckResult, ComplianceSummary, RiskLevel } from './types';
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
  runBalanceSheetBalance,
  runRevenuePresentCheck,
} from './checks';

const ALL_CHECKS = [
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
  runBalanceSheetBalance,
  runRevenuePresentCheck,
];

export function runComplianceChecks(rows: TrialBalanceRow[]): ComplianceSummary {
  const results: CheckResult[] = ALL_CHECKS.map((fn) => fn(rows));

  const compliant = results.filter((r) => r.status === 'COMPLIANT').length;
  const warnings = results.filter((r) => r.status === 'WARNING').length;
  const highRisk = results.filter((r) => r.status === 'HIGH_RISK').length;

  const totalRisk = results.reduce((s, r) => s + r.riskScore, 0);
  const maxRisk = results.length * 100;
  const overallScore = Math.round(Math.max(0, 100 - (totalRisk / maxRisk) * 100));

  let riskLevel: RiskLevel = 'LOW';
  if (highRisk > 0 || overallScore < 60) riskLevel = 'HIGH';
  else if (warnings > 2 || overallScore < 80) riskLevel = 'MEDIUM';

  return {
    overallScore,
    riskLevel,
    totalChecks: results.length,
    compliant,
    warnings,
    highRisk,
    results,
  };
}

export * from './types';
export * from './parser';
export * from './checks';
