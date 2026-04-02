import type { TrialBalanceRow } from '../compliance-engine/types';
import type { IncomeStatementData, LineItem } from './types';
import { classifyAccounts, filterByCategory } from './classifier';

function toLineItem(row: { accountCode: string; accountName: string }, amount: number): LineItem {
  return { accountCode: row.accountCode, accountName: row.accountName, amount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateIncomeStatement(rows: TrialBalanceRow[]): IncomeStatementData {
  const classified = classifyAccounts(rows);

  // Revenue: credit-normal accounts — net = credit - debit
  const revenueRows = filterByCategory(classified, 'REVENUE');
  const revenue: LineItem[] = revenueRows.map((r) => toLineItem(r, round2(r.credit - r.debit)));
  const revenueTotal = round2(revenue.reduce((s, i) => s + i.amount, 0));

  // Cost of Goods Sold: debit-normal — net = debit - credit
  const cogsRows = filterByCategory(classified, 'COGS');
  const cogs: LineItem[] = cogsRows.map((r) => toLineItem(r, round2(r.debit - r.credit)));
  const cogsTotal = round2(cogs.reduce((s, i) => s + i.amount, 0));

  const grossProfit = round2(revenueTotal - cogsTotal);

  // Operating expenses: debit-normal — net = debit - credit
  const opexRows = filterByCategory(classified, 'OPEX');
  const opex: LineItem[] = opexRows.map((r) => toLineItem(r, round2(r.debit - r.credit)));
  const opexTotal = round2(opex.reduce((s, i) => s + i.amount, 0));

  const operatingProfit = round2(grossProfit - opexTotal);

  // Finance income: credit-normal
  const financeIncomeRows = filterByCategory(classified, 'FINANCE_INCOME');
  const financeIncome: LineItem[] = financeIncomeRows.map((r) => toLineItem(r, round2(r.credit - r.debit)));
  const financeIncomeTotal = round2(financeIncome.reduce((s, i) => s + i.amount, 0));

  // Finance costs: debit-normal
  const financeCostsRows = filterByCategory(classified, 'FINANCE_COST');
  const financeCosts: LineItem[] = financeCostsRows.map((r) => toLineItem(r, round2(r.debit - r.credit)));
  const financeCostsTotal = round2(financeCosts.reduce((s, i) => s + i.amount, 0));

  const profitBeforeTax = round2(operatingProfit + financeIncomeTotal - financeCostsTotal);

  // Tax expense: debit-normal
  const taxExpenseRows = filterByCategory(classified, 'TAX_EXPENSE');
  const taxExpense: LineItem[] = taxExpenseRows.map((r) => toLineItem(r, round2(r.debit - r.credit)));
  const taxExpenseTotal = round2(taxExpense.reduce((s, i) => s + i.amount, 0));

  const netProfit = round2(profitBeforeTax - taxExpenseTotal);

  return {
    revenue,
    revenueTotal,
    cogs,
    cogsTotal,
    grossProfit,
    opex,
    opexTotal,
    operatingProfit,
    financeIncome,
    financeIncomeTotal,
    financeCosts,
    financeCostsTotal,
    profitBeforeTax,
    taxExpense,
    taxExpenseTotal,
    netProfit,
  };
}
