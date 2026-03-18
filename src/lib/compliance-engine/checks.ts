import type { TrialBalanceRow, CheckResult } from './types';

// Key accounts expected per IFRS / SA practice
const EXPECTED_ACCOUNTS = [
  { pattern: /retained.?earnings|accumulated.?profit/i, name: 'Retained earnings / Accumulated profit' },
  { pattern: /share.?capital|stated.?capital/i, name: 'Share capital / Stated capital' },
  { pattern: /revenue|sales|turnover/i, name: 'Revenue / Sales' },
  { pattern: /cost.?of.?sales|cost.?of.?goods/i, name: 'Cost of sales' },
  { pattern: /trade.?receivables|debtors/i, name: 'Trade receivables' },
  { pattern: /trade.?payables|creditors/i, name: 'Trade payables' },
  { pattern: /cash|bank/i, name: 'Cash / Bank' },
  { pattern: /fixed.?assets|property.?plant/i, name: 'Fixed assets / PPE' },
];

// SARS-aligned VAT accounts
const VAT_ACCOUNTS = [
  { pattern: /vat.?input|input.?vat/i, type: 'input' as const },
  { pattern: /vat.?output|output.?vat/i, type: 'output' as const },
];

// PAYE related
const PAYE_ACCOUNTS = [
  { pattern: /paye|pay.?as.?you.?earn|employees.?tax/i, type: 'paye' as const },
  { pattern: /uif|unemployment.?insurance/i, type: 'uif' as const },
  { pattern: /sdl|skills.?development|levy/i, type: 'sdl' as const },
];

function sumDebits(rows: TrialBalanceRow[]): number {
  return rows.reduce((s, r) => s + r.debit, 0);
}

function sumCredits(rows: TrialBalanceRow[]): number {
  return rows.reduce((s, r) => s + r.credit, 0);
}

function findAccounts(rows: TrialBalanceRow[], pattern: RegExp): TrialBalanceRow[] {
  return rows.filter((r) => pattern.test(r.accountName) || pattern.test(r.accountCode));
}

export function runTrialBalanceBalances(rows: TrialBalanceRow[]): CheckResult {
  const totalDebits = sumDebits(rows);
  const totalCredits = sumCredits(rows);
  const diff = Math.abs(totalDebits - totalCredits);
  const tolerance = 0.01;

  if (diff <= tolerance) {
    return {
      ruleCode: 'TB_BALANCE',
      ruleName: 'Trial Balance Balances',
      category: 'IFRS',
      status: 'COMPLIANT',
      riskScore: 0,
      message: 'Trial balance debits equal credits. The books are in balance.',
      details: { totalDebits, totalCredits },
    };
  }

  const riskScore = Math.min(100, Math.round((diff / Math.max(totalDebits, totalCredits, 1)) * 500));
  return {
    ruleCode: 'TB_BALANCE',
    ruleName: 'Trial Balance Balances',
    category: 'IFRS',
    status: 'HIGH_RISK',
    riskScore: Math.max(60, riskScore),
    message: `Trial balance does not balance. Debits (R${totalDebits.toLocaleString('en-ZA')}) do not equal credits (R${totalCredits.toLocaleString('en-ZA')}). Difference: R${diff.toLocaleString('en-ZA')}. This must be resolved before audit.`,
    details: { totalDebits, totalCredits, difference: diff },
  };
}

export function runRevenueExpenseReasonability(rows: TrialBalanceRow[]): CheckResult {
  const revenuePattern = /revenue|sales|turnover|income/i;
  const expensePattern = /expense|cost|operating/i;

  const revenue = rows
    .filter((r) => revenuePattern.test(r.accountName) || revenuePattern.test(r.accountCode))
    .reduce((s, r) => s + (r.credit - r.debit), 0);

  const expenses = rows
    .filter((r) => expensePattern.test(r.accountName) || expensePattern.test(r.accountCode))
    .reduce((s, r) => s + (r.debit - r.credit), 0);

  if (revenue === 0 && expenses === 0) {
    return {
      ruleCode: 'REV_EXP_REASONABILITY',
      ruleName: 'Revenue vs Expense Reasonability',
      category: 'IFRS',
      status: 'WARNING',
      riskScore: 30,
      message: 'Revenue and expense accounts could not be identified. Ensure nominal accounts are properly named for audit clarity.',
    };
  }

  const grossMargin = revenue > 0 ? (revenue - expenses) / revenue : 0;
  if (grossMargin < -0.5 && revenue > 0) {
    return {
      ruleCode: 'REV_EXP_REASONABILITY',
      ruleName: 'Revenue vs Expense Reasonability',
      category: 'IFRS',
      status: 'WARNING',
      riskScore: 50,
      message: `Expenses appear significantly higher than revenue (gross margin: ${(grossMargin * 100).toFixed(1)}%). Verify classification and that all accounts are correctly categorised.`,
      details: { revenue, expenses, grossMargin },
    };
  }

  return {
    ruleCode: 'REV_EXP_REASONABILITY',
    ruleName: 'Revenue vs Expense Reasonability',
    category: 'IFRS',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'Revenue and expense classification appears reasonable. No obvious misclassifications detected.',
    details: { revenue, expenses },
  };
}

export function runMissingKeyAccounts(rows: TrialBalanceRow[]): CheckResult {
  const found: string[] = [];
  const missing: string[] = [];

  for (const { pattern, name } of EXPECTED_ACCOUNTS) {
    const matches = findAccounts(rows, pattern);
    if (matches.length > 0) found.push(name);
    else missing.push(name);
  }

  if (missing.length === 0) {
    return {
      ruleCode: 'MISSING_KEY_ACCOUNTS',
      ruleName: 'Key Accounts Present',
      category: 'IFRS',
      status: 'COMPLIANT',
      riskScore: 0,
      message: 'All expected key accounts for IFRS-compliant financial statements are present.',
    };
  }

  if (missing.length <= 2) {
    return {
      ruleCode: 'MISSING_KEY_ACCOUNTS',
      ruleName: 'Key Accounts Present',
      category: 'IFRS',
      status: 'WARNING',
      riskScore: 40,
      message: `Some expected accounts may be missing or named differently: ${missing.join(', ')}. Review for completeness.`,
      details: { missing, found },
    };
  }

  return {
    ruleCode: 'MISSING_KEY_ACCOUNTS',
    ruleName: 'Key Accounts Present',
    category: 'IFRS',
    status: 'HIGH_RISK',
    riskScore: 70,
    message: `Several key accounts expected under IFRS appear missing: ${missing.join(', ')}. This may affect audit readiness.`,
    details: { missing, found },
  };
}

export function runUnusualNegativeBalances(rows: TrialBalanceRow[]): CheckResult {
  const issues: { account: string; balance: number }[] = [];
  const assetPattern = /asset|receivable|debtor|bank|cash|inventory|stock/i;
  const liabilityPattern = /payable|creditor|liability|loan|overdraft/i;

  for (const r of rows) {
    const net = r.debit - r.credit;
    const isAsset = assetPattern.test(r.accountName) || assetPattern.test(r.accountCode);
    const isLiability = liabilityPattern.test(r.accountName) || liabilityPattern.test(r.accountCode);

    if (isAsset && net < 0 && Math.abs(net) > 100) {
      issues.push({ account: `${r.accountCode} - ${r.accountName}`, balance: net });
    }
    if (isLiability && net > 0 && net > 100) {
      issues.push({ account: `${r.accountCode} - ${r.accountName}`, balance: -net });
    }
  }

  if (issues.length === 0) {
    return {
      ruleCode: 'NEGATIVE_BALANCES',
      ruleName: 'Unusual Negative Balances',
      category: 'IFRS',
      status: 'COMPLIANT',
      riskScore: 0,
      message: 'No unusual negative balances detected in asset or liability accounts.',
    };
  }

  return {
    ruleCode: 'NEGATIVE_BALANCES',
    ruleName: 'Unusual Negative Balances',
    category: 'IFRS',
    status: issues.length > 3 ? 'HIGH_RISK' : 'WARNING',
    riskScore: Math.min(80, 30 + issues.length * 15),
    message: `Unusual balances detected in ${issues.length} account(s). Assets should typically show debit balances; liabilities should show credit balances. Review: ${issues.slice(0, 3).map((i) => i.account).join(', ')}${issues.length > 3 ? '...' : ''}`,
    details: { issues },
  };
}

export function runCompaniesActCompleteness(rows: TrialBalanceRow[]): CheckResult {
  const totalEntries = rows.length;
  const totalValue = rows.reduce((s, r) => s + r.debit + r.credit, 0);
  const hasSubstantialData = totalEntries >= 10 && totalValue > 0;

  if (!hasSubstantialData) {
    return {
      ruleCode: 'COMPANIES_ACT_COMPLETENESS',
      ruleName: 'Financial Records Completeness',
      category: 'COMPANIES_ACT',
      status: 'WARNING',
      riskScore: 50,
      message: 'Trial balance has limited entries. Companies Act requires complete financial records. Ensure all accounts and supporting documentation are captured.',
      details: { totalEntries, totalValue },
    };
  }

  return {
    ruleCode: 'COMPANIES_ACT_COMPLETENESS',
    ruleName: 'Financial Records Completeness',
    category: 'COMPANIES_ACT',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'Trial balance shows substantive financial data. Good indicator of records completeness for Companies Act purposes.',
    details: { totalEntries, totalValue },
  };
}

export function runVATIndicators(rows: TrialBalanceRow[]): CheckResult {
  let totalInput = 0;
  let totalOutput = 0;

  for (const { pattern, type } of VAT_ACCOUNTS) {
    const matches = findAccounts(rows, pattern);
    for (const m of matches) {
      if (type === 'input') totalInput += m.debit - m.credit;
      else totalOutput += m.credit - m.debit;
    }
  }

  const hasVAT = totalInput !== 0 || totalOutput !== 0;
  if (!hasVAT) {
    return {
      ruleCode: 'VAT_INDICATORS',
      ruleName: 'VAT Input/Output Consistency',
      category: 'TAX',
      status: 'WARNING',
      riskScore: 25,
      message: 'No VAT accounts identified. If the company is VAT registered, ensure VAT input and output accounts are included.',
    };
  }

  const netVAT = totalInput - totalOutput;
  const largeDiscrepancy = Math.abs(netVAT) > 100000;

  if (largeDiscrepancy) {
    return {
      ruleCode: 'VAT_INDICATORS',
      ruleName: 'VAT Input/Output Consistency',
      category: 'TAX',
      status: 'WARNING',
      riskScore: 45,
      message: `Significant net VAT position (R${netVAT.toLocaleString('en-ZA')}). Verify VAT 201 returns and reconciliations are up to date for SARS compliance.`,
      details: { totalInput, totalOutput, netVAT },
    };
  }

  return {
    ruleCode: 'VAT_INDICATORS',
    ruleName: 'VAT Input/Output Consistency',
    category: 'TAX',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'VAT accounts present. Consider reconciling to VAT 201 returns before audit.',
    details: { totalInput, totalOutput },
  };
}

export function runPAYEChecks(rows: TrialBalanceRow[]): CheckResult {
  const payeAccounts = findAccounts(rows, /paye|pay.?as.?you.?earn|employees.?tax/i);
  const salaryAccounts = findAccounts(rows, /salaries|wages|remuneration|staff.?cost/i);

  if (salaryAccounts.length > 0 && payeAccounts.length === 0) {
    return {
      ruleCode: 'PAYE_CHECKS',
      ruleName: 'PAYE-Related Account Checks',
      category: 'TAX',
      status: 'WARNING',
      riskScore: 55,
      message: 'Salary/wages accounts present but no PAYE account identified. Ensure employee tax withholdings are properly recorded for SARS compliance.',
    };
  }

  if (payeAccounts.length > 0) {
    const payeBalance = payeAccounts.reduce((s, r) => s + (r.credit - r.debit), 0);
    if (payeBalance > 10000) {
      return {
        ruleCode: 'PAYE_CHECKS',
        ruleName: 'PAYE-Related Account Checks',
        category: 'TAX',
        status: 'WARNING',
        riskScore: 40,
        message: `PAYE liability balance (R${payeBalance.toLocaleString('en-ZA')}) should be reconciled to EMP201 returns. Ensure payments are up to date.`,
        details: { payeBalance },
      };
    }
  }

  return {
    ruleCode: 'PAYE_CHECKS',
    ruleName: 'PAYE-Related Account Checks',
    category: 'TAX',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'PAYE indicators appear reasonable. Reconcile to EMP201 before filing.',
  };
}

export function runProvisionalTaxIndicators(rows: TrialBalanceRow[]): CheckResult {
  const incomeTaxAccounts = findAccounts(rows, /income.?tax|provisional|current.?tax|deferred.?tax/i);

  if (incomeTaxAccounts.length === 0) {
    return {
      ruleCode: 'PROVISIONAL_TAX',
      ruleName: 'Provisional Tax Completeness',
      category: 'TAX',
      status: 'WARNING',
      riskScore: 30,
      message: 'No income tax or provisional tax accounts identified. Companies are generally required to make provisional tax payments. Verify tax provisioning is complete.',
    };
  }

  return {
    ruleCode: 'PROVISIONAL_TAX',
    ruleName: 'Provisional Tax Completeness',
    category: 'TAX',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'Income/provisional tax accounts present. Ensure IRP6 returns and payments are up to date.',
    details: { accountCount: incomeTaxAccounts.length },
  };
}

export function runDuplicateEntries(rows: TrialBalanceRow[]): CheckResult {
  const seen = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const key = `${rows[i].accountCode}|${rows[i].accountName}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(i);
  }

  const duplicates = [...seen.entries()].filter(([, indices]) => indices.length > 1);

  if (duplicates.length === 0) {
    return {
      ruleCode: 'DUPLICATE_ENTRIES',
      ruleName: 'Duplicate or Inconsistent Entries',
      category: 'VALIDATION',
      status: 'COMPLIANT',
      riskScore: 0,
      message: 'No duplicate account entries detected.',
    };
  }

  return {
    ruleCode: 'DUPLICATE_ENTRIES',
    ruleName: 'Duplicate or Inconsistent Entries',
    category: 'VALIDATION',
    status: 'WARNING',
    riskScore: 50,
    message: `Possible duplicate entries for ${duplicates.length} account(s). Consider consolidating or verifying.`,
    details: { duplicates: duplicates.map(([k]) => k) },
  };
}

export function runLargeUnexplainedValues(rows: TrialBalanceRow[]): CheckResult {
  const total = rows.reduce((s, r) => s + r.debit + r.credit, 0);
  const avg = total / (rows.length || 1);
  const threshold = avg * 20;
  const large = rows.filter((r) => r.debit + r.credit > threshold && threshold > 0);

  if (large.length === 0) {
    return {
      ruleCode: 'LARGE_VALUES',
      ruleName: 'Large Unexplained Values',
      category: 'VALIDATION',
      status: 'COMPLIANT',
      riskScore: 0,
      message: 'No unusually large individual line items detected.',
    };
  }

  if (large.length > 5) {
    return {
      ruleCode: 'LARGE_VALUES',
      ruleName: 'Large Unexplained Values',
      category: 'VALIDATION',
      status: 'WARNING',
      riskScore: 35,
      message: `Several line items (${large.length}) are significantly larger than average. Review for material misstatements or classification errors.`,
      details: { count: large.length, sample: large.slice(0, 3).map((r) => r.accountName) },
    };
  }

  return {
    ruleCode: 'LARGE_VALUES',
    ruleName: 'Large Unexplained Values',
    category: 'VALIDATION',
    status: 'COMPLIANT',
    riskScore: 0,
    message: 'Some large values present. Ensure they are expected and properly documented.',
  };
}
