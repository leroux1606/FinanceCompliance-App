import type { TrialBalanceRow } from '../compliance-engine/types';
import type { CashFlowData, CashFlowItem } from './types';
import type { IncomeStatementData } from './types';
import { classifyAccounts, filterByCategory } from './classifier';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function generateCashFlow(rows: TrialBalanceRow[], is: IncomeStatementData): CashFlowData {
  const classified = classifyAccounts(rows);

  // ── Closing cash directly from trial balance ─────────────────────────────
  const cashRows = filterByCategory(classified, 'CASH');
  const closingCash = round2(cashRows.reduce((s, r) => s + (r.debit - r.credit), 0));

  // ── Non-cash add-backs (depreciation & amortisation) ────────────────────
  // These are already in OPEX — identify by sub-pattern
  const deprecPattern = /depreciation|amortis/i;
  const nonCashItems = is.opex.filter((item) => deprecPattern.test(item.accountName));
  const nonCashAdjustments: CashFlowItem[] = nonCashItems.map((item) => ({
    label: `Add: ${item.accountName}`,
    amount: item.amount,
  }));
  const nonCashAdjustmentsTotal = round2(nonCashAdjustments.reduce((s, i) => s + i.amount, 0));

  // ── Operating activities subtotal (limited — working capital not computable) ──
  const operatingActivitiesSubtotal = round2(is.netProfit + nonCashAdjustmentsTotal);

  // ── Investing activities ─────────────────────────────────────────────────
  // Without a prior-period TB, we show the closing balance of non-current assets
  // as context. Movements cannot be determined from a single period.
  const ncaRows = filterByCategory(classified, 'NON_CURRENT_ASSET');
  const investingActivities: CashFlowItem[] = ncaRows
    .map((r) => ({ label: r.accountName, amount: round2(r.debit - r.credit) }))
    .filter((i) => i.amount !== 0);
  const investingActivitiesTotal = round2(investingActivities.reduce((s, i) => s + i.amount, 0));

  // ── Financing activities ─────────────────────────────────────────────────
  // Show closing balances of long-term liabilities as context.
  const ncLiabRows = filterByCategory(classified, 'NON_CURRENT_LIABILITY');
  const financingActivities: CashFlowItem[] = ncLiabRows
    .map((r) => ({ label: r.accountName, amount: round2(r.credit - r.debit) }))
    .filter((i) => i.amount !== 0);
  const financingActivitiesTotal = round2(financingActivities.reduce((s, i) => s + i.amount, 0));

  // Net movement is approximated from operating subtotal (investing/financing are
  // balances, not movements, without a comparative period)
  const netMovement = operatingActivitiesSubtotal;

  return {
    netProfit: is.netProfit,
    nonCashAdjustments,
    nonCashAdjustmentsTotal,
    operatingActivitiesSubtotal,
    requiresComparativeNote: true,
    workingCapitalNote:
      'Working capital changes (movements in receivables, payables, and inventory) cannot be determined from a single period trial balance. Upload a comparative trial balance to produce a complete cash flow statement.',
    investingActivities,
    investingActivitiesTotal,
    financingActivities,
    financingActivitiesTotal,
    netMovement,
    openingCash: 0,
    closingCash,
  };
}
