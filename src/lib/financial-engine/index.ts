import type { TrialBalanceRow } from '../compliance-engine/types';
import type { FinancialStatementsResult } from './types';
import { generateIncomeStatement } from './income-statement';
import { generateBalanceSheet } from './balance-sheet';
import { generateCashFlow } from './cash-flow';

export function generateFinancialStatements(rows: TrialBalanceRow[]): FinancialStatementsResult {
  const incomeStatement = generateIncomeStatement(rows);
  const balanceSheet = generateBalanceSheet(rows, incomeStatement.netProfit);
  const cashFlow = generateCashFlow(rows, incomeStatement);

  return { incomeStatement, balanceSheet, cashFlow };
}

export * from './types';
export * from './classifier';
export * from './income-statement';
export * from './balance-sheet';
export * from './cash-flow';
