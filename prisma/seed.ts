import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPLIANCE_RULES = [
  { code: 'TB_BALANCE', name: 'Trial Balance Balances', category: 'IFRS', description: 'Verifies debits equal credits', severity: 'HIGH' },
  { code: 'REV_EXP_REASONABILITY', name: 'Revenue vs Expense Reasonability', category: 'IFRS', description: 'Checks revenue/expense classification', severity: 'MEDIUM' },
  { code: 'MISSING_KEY_ACCOUNTS', name: 'Key Accounts Present', category: 'IFRS', description: 'Validates key IFRS accounts exist', severity: 'MEDIUM' },
  { code: 'NEGATIVE_BALANCES', name: 'Unusual Negative Balances', category: 'IFRS', description: 'Flags unexpected asset/liability balances', severity: 'MEDIUM' },
  { code: 'COMPANIES_ACT_COMPLETENESS', name: 'Financial Records Completeness', category: 'COMPANIES_ACT', description: 'SA Companies Act records indicator', severity: 'MEDIUM' },
  { code: 'VAT_INDICATORS', name: 'VAT Input/Output Consistency', category: 'TAX', description: 'SARS VAT alignment check', severity: 'MEDIUM' },
  { code: 'PAYE_CHECKS', name: 'PAYE-Related Account Checks', category: 'TAX', description: 'Employee tax compliance indicator', severity: 'MEDIUM' },
  { code: 'PROVISIONAL_TAX', name: 'Provisional Tax Completeness', category: 'TAX', description: 'Income tax provisioning check', severity: 'MEDIUM' },
  { code: 'DUPLICATE_ENTRIES', name: 'Duplicate Entries', category: 'VALIDATION', description: 'Detects duplicate account entries', severity: 'LOW' },
  { code: 'LARGE_VALUES', name: 'Large Unexplained Values', category: 'VALIDATION', description: 'Flags unusually large line items', severity: 'LOW' },
];

// Sample South African trial balance data (ZAR)
const SAMPLE_TRIAL_BALANCE = [
  { accountCode: '1000', accountName: 'Share Capital', debit: 0, credit: 500000 },
  { accountCode: '1100', accountName: 'Retained Earnings', debit: 0, credit: 125000 },
  { accountCode: '2000', accountName: 'Revenue / Sales', debit: 0, credit: 850000 },
  { accountCode: '2100', accountName: 'Cost of Sales', debit: 320000, credit: 0 },
  { accountCode: '2200', accountName: 'Operating Expenses', debit: 180000, credit: 0 },
  { accountCode: '2300', accountName: 'Salaries and Wages', debit: 150000, credit: 0 },
  { accountCode: '2400', accountName: 'PAYE Payable', debit: 0, credit: 28500 },
  { accountCode: '2500', accountName: 'UIF Payable', debit: 0, credit: 2100 },
  { accountCode: '3000', accountName: 'Trade Receivables (Debtors)', debit: 95000, credit: 0 },
  { accountCode: '3100', accountName: 'Trade Payables (Creditors)', debit: 0, credit: 45000 },
  { accountCode: '4000', accountName: 'Bank', debit: 120000, credit: 0 },
  { accountCode: '4100', accountName: 'Fixed Assets - PPE', debit: 250000, credit: 0 },
  { accountCode: '4200', accountName: 'Accumulated Depreciation', debit: 0, credit: 50000 },
  { accountCode: '5000', accountName: 'VAT Input', debit: 28500, credit: 0 },
  { accountCode: '5100', accountName: 'VAT Output', debit: 0, credit: 127500 },
  { accountCode: '6000', accountName: 'Income Tax Expense', debit: 35000, credit: 0 },
  { accountCode: '6100', accountName: 'Current Tax Payable', debit: 0, credit: 28000 },
];

async function main() {
  console.log('Seeding database...');

  for (const r of COMPLIANCE_RULES) {
    await prisma.complianceRule.upsert({
      where: { code: r.code },
      create: { ...r, description: r.description, config: null },
      update: { name: r.name, category: r.category, severity: r.severity },
    });
  }
  console.log('Compliance rules seeded.');

  let company = await prisma.company.findFirst({
    where: { name: 'Acme Trading (Pty) Ltd' },
    include: { trialBalances: true },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Acme Trading (Pty) Ltd',
        industry: 'Wholesale and Retail',
        financialYearEnd: '2024-02-28',
      },
    });
  }

  if (company.trialBalances && (company as { trialBalances: unknown[] }).trialBalances.length > 0) {
    console.log('Sample data already exists. Skipping trial balance creation.');
    return;
  }

  const fyEnd = new Date('2024-02-28');
  const tb = await prisma.trialBalance.create({
    data: {
      companyId: company.id,
      periodEnd: fyEnd,
    },
  });

  await prisma.trialBalanceEntry.createMany({
    data: SAMPLE_TRIAL_BALANCE.map((e) => ({
      trialBalanceId: tb.id,
      accountCode: e.accountCode,
      accountName: e.accountName,
      debit: e.debit,
      credit: e.credit,
    })),
  });

  const rules = await prisma.complianceRule.findMany();
  const { runComplianceChecks } = await import('../src/lib/compliance-engine');
  const summary = runComplianceChecks(SAMPLE_TRIAL_BALANCE);

  for (const r of summary.results) {
    const rule = rules.find((ru) => ru.code === r.ruleCode) ?? rules[0];
    await prisma.complianceCheckResult.create({
      data: {
        trialBalanceId: tb.id,
        ruleId: rule.id,
        status: r.status,
        riskScore: r.riskScore,
        message: r.message,
        details: r.details ? JSON.stringify(r.details) : null,
      },
    });
  }

  const reportData = {
    executiveSummary: `Compliance assessment completed for ${company.name}. Overall score: ${summary.overallScore}%. Risk level: ${summary.riskLevel}.`,
    complianceScore: summary.overallScore,
    riskLevel: summary.riskLevel,
    issues: summary.results.filter((x) => x.status !== 'COMPLIANT'),
    recommendations: summary.results.filter((x) => x.status !== 'COMPLIANT').map((x) => x.message),
  };

  await prisma.complianceReport.create({
    data: {
      companyId: company.id,
      trialBalanceId: tb.id,
      complianceScore: summary.overallScore,
      riskLevel: summary.riskLevel,
      summaryJson: JSON.stringify(reportData),
    },
  });

  console.log('Sample company, trial balance, and report created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
