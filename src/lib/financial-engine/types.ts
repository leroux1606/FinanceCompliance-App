import type { TrialBalanceRow } from '../compliance-engine/types';

export type { TrialBalanceRow };

export type AccountCategory =
  | 'REVENUE'
  | 'COGS'
  | 'OPEX'
  | 'FINANCE_INCOME'
  | 'FINANCE_COST'
  | 'TAX_EXPENSE'
  | 'NON_CURRENT_ASSET'
  | 'CURRENT_ASSET'
  | 'CASH'
  | 'EQUITY'
  | 'NON_CURRENT_LIABILITY'
  | 'CURRENT_LIABILITY'
  | 'UNCLASSIFIED';

export interface ClassifiedRow extends TrialBalanceRow {
  category: AccountCategory;
}

export interface LineItem {
  accountCode: string;
  accountName: string;
  amount: number;
}

// ─── Income Statement ────────────────────────────────────────────────────────

export interface IncomeStatementData {
  revenue: LineItem[];
  revenueTotal: number;
  cogs: LineItem[];
  cogsTotal: number;
  grossProfit: number;
  opex: LineItem[];
  opexTotal: number;
  operatingProfit: number;
  financeIncome: LineItem[];
  financeIncomeTotal: number;
  financeCosts: LineItem[];
  financeCostsTotal: number;
  profitBeforeTax: number;
  taxExpense: LineItem[];
  taxExpenseTotal: number;
  netProfit: number;
}

// ─── Balance Sheet ───────────────────────────────────────────────────────────

export interface BalanceSheetData {
  nonCurrentAssets: LineItem[];
  nonCurrentAssetsTotal: number;
  currentAssets: LineItem[];
  currentAssetsTotal: number;
  totalAssets: number;
  equity: LineItem[];
  equityTotal: number;
  nonCurrentLiabilities: LineItem[];
  nonCurrentLiabilitiesTotal: number;
  currentLiabilities: LineItem[];
  currentLiabilitiesTotal: number;
  totalEquityAndLiabilities: number;
  isBalanced: boolean;
  difference: number;
}

// ─── Cash Flow Statement ─────────────────────────────────────────────────────

export interface CashFlowItem {
  label: string;
  amount: number;
}

export interface CashFlowData {
  netProfit: number;
  nonCashAdjustments: CashFlowItem[];
  nonCashAdjustmentsTotal: number;
  operatingActivitiesSubtotal: number;
  requiresComparativeNote: boolean;
  workingCapitalNote: string;
  investingActivities: CashFlowItem[];
  investingActivitiesTotal: number;
  financingActivities: CashFlowItem[];
  financingActivitiesTotal: number;
  netMovement: number;
  openingCash: number;
  closingCash: number;
}

// ─── Combined Result ─────────────────────────────────────────────────────────

export interface FinancialStatementsResult {
  incomeStatement: IncomeStatementData;
  balanceSheet: BalanceSheetData;
  cashFlow: CashFlowData;
}
