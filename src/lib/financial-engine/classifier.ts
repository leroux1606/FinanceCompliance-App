import type { TrialBalanceRow } from '../compliance-engine/types';
import type { AccountCategory, ClassifiedRow } from './types';

// Classification rules checked in priority order — first match wins.
// More specific patterns are listed before general ones to avoid mis-classification.
const CLASSIFICATION_RULES: { category: AccountCategory; pattern: RegExp }[] = [
  // Liabilities matched early so "Tax Payable", "VAT Output", "PAYE Payable" etc.
  // are caught before broader income/expense patterns fire.
  {
    category: 'CURRENT_LIABILITY',
    pattern: /payable|creditor|vat.?output|output.?vat|paye|uif|sdl|overdraft|current.?tax.?pay|tax.?pay/i,
  },
  {
    category: 'NON_CURRENT_LIABILITY',
    pattern: /long.?term.?loan|term.?loan|mortgage|debenture|bond.?payable|non.?current.?liabilit/i,
  },

  // Equity
  {
    category: 'EQUITY',
    pattern: /share.?capital|stated.?capital|retained.?earnings|accumulated.?profit|accumulated.?loss/i,
  },

  // Specific expense sub-types before general OPEX / revenue patterns
  { category: 'TAX_EXPENSE', pattern: /income.?tax.?expense|deferred.?tax|provisional.?tax|tax.?charge/i },
  { category: 'FINANCE_INCOME', pattern: /interest.?income|finance.?income|investment.?income|dividend.?income/i },
  { category: 'FINANCE_COST', pattern: /interest.?expense|finance.?cost|finance.?charge|borrowing.?cost/i },
  { category: 'COGS', pattern: /cost.?of.?(sales|goods)|cogs/i },

  // Assets — specific before general
  { category: 'CASH', pattern: /^cash$|^bank$|cash.?and.?cash|bank.?balance|petty.?cash/i },
  {
    category: 'NON_CURRENT_ASSET',
    pattern: /fixed.?asset|property.?plant|plant.?and.?equipment|ppe|intangible|goodwill|accumulated.?depreciation|right.?of.?use/i,
  },
  {
    category: 'CURRENT_ASSET',
    pattern: /receivable|debtor|inventory|stock|prepayment|prepaid|vat.?input|input.?vat|work.?in.?progress/i,
  },

  // Broad cash/bank catch-all after specific asset patterns
  { category: 'CASH', pattern: /cash|bank/i },

  // Income statement — revenue then operating expenses
  { category: 'REVENUE', pattern: /revenue|sales|turnover/i },
  {
    category: 'OPEX',
    pattern: /expense|salary|salaries|wage|wages|rent|insurance|admin|utilities|maintenance|repair|depreciation|amortis|staff.?cost|remuneration/i,
  },
];

export function classifyAccounts(rows: TrialBalanceRow[]): ClassifiedRow[] {
  return rows.map((row) => {
    const searchText = `${row.accountName} ${row.accountCode}`;
    for (const { category, pattern } of CLASSIFICATION_RULES) {
      if (pattern.test(searchText)) {
        return { ...row, category };
      }
    }
    return { ...row, category: 'UNCLASSIFIED' };
  });
}

export function filterByCategory(classified: ClassifiedRow[], category: AccountCategory): ClassifiedRow[] {
  return classified.filter((r) => r.category === category);
}
