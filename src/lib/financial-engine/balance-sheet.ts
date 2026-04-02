import type { TrialBalanceRow } from '../compliance-engine/types';
import type { BalanceSheetData, LineItem } from './types';
import { classifyAccounts, filterByCategory } from './classifier';

function toLineItem(row: { accountCode: string; accountName: string }, amount: number): LineItem {
  return { accountCode: row.accountCode, accountName: row.accountName, amount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateBalanceSheet(rows: TrialBalanceRow[], netProfit: number): BalanceSheetData {
  const classified = classifyAccounts(rows);

  // Assets are debit-normal (debit - credit). Accumulated depreciation has a credit balance
  // so it naturally reduces the total when computed as debit - credit.
  const nonCurrentAssets: LineItem[] = filterByCategory(classified, 'NON_CURRENT_ASSET').map((r) =>
    toLineItem(r, round2(r.debit - r.credit)),
  );
  const nonCurrentAssetsTotal = round2(nonCurrentAssets.reduce((s, i) => s + i.amount, 0));

  const currentAssets: LineItem[] = filterByCategory(classified, 'CURRENT_ASSET').map((r) =>
    toLineItem(r, round2(r.debit - r.credit)),
  );

  const cashAssets: LineItem[] = filterByCategory(classified, 'CASH').map((r) =>
    toLineItem(r, round2(r.debit - r.credit)),
  );

  // Merge cash into current assets for display
  const allCurrentAssets = [...currentAssets, ...cashAssets];
  const currentAssetsTotal = round2(allCurrentAssets.reduce((s, i) => s + i.amount, 0));

  const totalAssets = round2(nonCurrentAssetsTotal + currentAssetsTotal);

  // Equity is credit-normal (credit - debit). Net profit is injected as current year profit.
  const equityRows: LineItem[] = filterByCategory(classified, 'EQUITY').map((r) =>
    toLineItem(r, round2(r.credit - r.debit)),
  );

  const equityWithProfit: LineItem[] = [
    ...equityRows,
    { accountCode: '', accountName: 'Profit for the Period', amount: round2(netProfit) },
  ];
  const equityTotal = round2(equityWithProfit.reduce((s, i) => s + i.amount, 0));

  // Liabilities are credit-normal (credit - debit)
  const nonCurrentLiabilities: LineItem[] = filterByCategory(classified, 'NON_CURRENT_LIABILITY').map((r) =>
    toLineItem(r, round2(r.credit - r.debit)),
  );
  const nonCurrentLiabilitiesTotal = round2(nonCurrentLiabilities.reduce((s, i) => s + i.amount, 0));

  const currentLiabilities: LineItem[] = filterByCategory(classified, 'CURRENT_LIABILITY').map((r) =>
    toLineItem(r, round2(r.credit - r.debit)),
  );
  const currentLiabilitiesTotal = round2(currentLiabilities.reduce((s, i) => s + i.amount, 0));

  const totalEquityAndLiabilities = round2(equityTotal + nonCurrentLiabilitiesTotal + currentLiabilitiesTotal);

  const difference = round2(Math.abs(totalAssets - totalEquityAndLiabilities));
  const isBalanced = difference <= 0.01;

  return {
    nonCurrentAssets,
    nonCurrentAssetsTotal,
    currentAssets: allCurrentAssets,
    currentAssetsTotal,
    totalAssets,
    equity: equityWithProfit,
    equityTotal,
    nonCurrentLiabilities,
    nonCurrentLiabilitiesTotal,
    currentLiabilities,
    currentLiabilitiesTotal,
    totalEquityAndLiabilities,
    isBalanced,
    difference,
  };
}
