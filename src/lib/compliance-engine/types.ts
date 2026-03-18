export type CheckStatus = 'COMPLIANT' | 'WARNING' | 'HIGH_RISK';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface CheckResult {
  ruleCode: string;
  ruleName: string;
  category: 'IFRS' | 'COMPANIES_ACT' | 'TAX' | 'VALIDATION';
  status: CheckStatus;
  riskScore: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface ComplianceSummary {
  overallScore: number;
  riskLevel: RiskLevel;
  totalChecks: number;
  compliant: number;
  warnings: number;
  highRisk: number;
  results: CheckResult[];
}
