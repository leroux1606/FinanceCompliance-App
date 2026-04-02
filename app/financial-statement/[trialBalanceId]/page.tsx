'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/src/lib/utils';
import { formatCurrency, formatDate } from '@/src/lib/utils';
import type {
  FinancialStatementsResult,
  IncomeStatementData,
  BalanceSheetData,
  CashFlowData,
  LineItem,
} from '@/src/lib/financial-engine';

interface FinancialStatementResponse extends FinancialStatementsResult {
  id: string;
  trialBalanceId: string;
  companyId: string;
  company: { id: string; name: string };
  periodEnd: string;
  generatedAt: string;
}

type Tab = 'income' | 'balance' | 'cashflow';

// ─── Helper components ────────────────────────────────────────────────────────

function AmountRow({ label, amount, indent = false }: { label: string; amount: number; indent?: boolean }) {
  return (
    <div className={cn('flex justify-between py-1 text-sm', indent && 'pl-4')}>
      <span className="text-slate-600">{label}</span>
      <span className={cn('font-mono tabular-nums', amount < 0 ? 'text-red-600' : 'text-slate-900')}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function SubtotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between border-t py-2 text-sm font-semibold">
      <span className="text-slate-700">{label}</span>
      <span className={cn('font-mono tabular-nums', amount < 0 ? 'text-red-600' : 'text-slate-900')}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between border-t-2 py-2 text-base font-bold">
      <span className="text-slate-900">{label}</span>
      <span className={cn('font-mono tabular-nums', amount < 0 ? 'text-red-600' : 'text-emerald-700')}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function StatSection({
  title,
  items,
  total,
  sign = 1,
}: {
  title: string;
  items: LineItem[];
  total: number;
  sign?: 1 | -1;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {items.map((item, i) => (
        <AmountRow key={i} label={item.accountName} amount={sign * item.amount} />
      ))}
      <div className="flex justify-between border-t py-1 text-sm font-medium text-slate-700">
        <span>Total {title}</span>
        <span className={cn('font-mono tabular-nums', sign * total < 0 ? 'text-red-600' : 'text-slate-900')}>
          {formatCurrency(sign * total)}
        </span>
      </div>
    </section>
  );
}

// ─── Income Statement tab ─────────────────────────────────────────────────────

function IncomeStatementTab({ is }: { is: IncomeStatementData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatSection title="Revenue" items={is.revenue} total={is.revenueTotal} />
        <StatSection title="Cost of Sales" items={is.cogs} total={is.cogsTotal} sign={-1} />
        <SubtotalRow label="Gross Profit" amount={is.grossProfit} />

        <StatSection title="Operating Expenses" items={is.opex} total={is.opexTotal} sign={-1} />
        <SubtotalRow label="Operating Profit" amount={is.operatingProfit} />

        {is.financeIncome.length > 0 && (
          <StatSection title="Finance Income" items={is.financeIncome} total={is.financeIncomeTotal} />
        )}
        {is.financeCosts.length > 0 && (
          <StatSection title="Finance Costs" items={is.financeCosts} total={is.financeCostsTotal} sign={-1} />
        )}

        <SubtotalRow label="Profit Before Tax" amount={is.profitBeforeTax} />
        <StatSection title="Tax Expense" items={is.taxExpense} total={is.taxExpenseTotal} sign={-1} />

        <TotalRow label="Net Profit for the Period" amount={is.netProfit} />
      </CardContent>
    </Card>
  );
}

// ─── Balance Sheet tab ────────────────────────────────────────────────────────

function BalanceSheetTab({ bs }: { bs: BalanceSheetData }) {
  return (
    <div className="space-y-4">
      {!bs.isBalanced && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Balance sheet does not balance.</strong> Difference:{' '}
          {formatCurrency(bs.difference)}. Some accounts may be unclassified — check account names.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatSection title="Non-Current Assets" items={bs.nonCurrentAssets} total={bs.nonCurrentAssetsTotal} />
            <StatSection title="Current Assets" items={bs.currentAssets} total={bs.currentAssetsTotal} />
            <TotalRow label="Total Assets" amount={bs.totalAssets} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equity &amp; Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatSection title="Equity" items={bs.equity} total={bs.equityTotal} />
            {bs.nonCurrentLiabilities.length > 0 && (
              <StatSection
                title="Non-Current Liabilities"
                items={bs.nonCurrentLiabilities}
                total={bs.nonCurrentLiabilitiesTotal}
              />
            )}
            <StatSection title="Current Liabilities" items={bs.currentLiabilities} total={bs.currentLiabilitiesTotal} />
            <TotalRow label="Total Equity &amp; Liabilities" amount={bs.totalEquityAndLiabilities} />
          </CardContent>
        </Card>
      </div>

      {bs.isBalanced && (
        <p className="text-center text-sm text-emerald-600">
          Balance sheet balances — Assets equal Equity &amp; Liabilities.
        </p>
      )}
    </div>
  );
}

// ─── Cash Flow tab ────────────────────────────────────────────────────────────

function CashFlowTab({ cf }: { cf: CashFlowData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Statement (Indirect Method)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {cf.requiresComparativeNote && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>Note:</strong> {cf.workingCapitalNote}
          </div>
        )}

        <section>
          <h3 className="mb-2 font-semibold text-slate-700">Operating Activities</h3>
          <AmountRow label="Net Profit for the Period" amount={cf.netProfit} />
          {cf.nonCashAdjustments.map((item, i) => (
            <AmountRow key={i} label={item.label} amount={item.amount} indent />
          ))}
          {cf.nonCashAdjustments.length === 0 && (
            <p className="py-1 pl-4 text-sm text-slate-400">No depreciation / amortisation accounts identified.</p>
          )}
          <SubtotalRow label="Net Cash from Operating Activities *" amount={cf.operatingActivitiesSubtotal} />
          <p className="mt-1 text-xs text-slate-400">
            * Excludes working capital movements — upload a comparative trial balance for a complete statement.
          </p>
        </section>

        {cf.investingActivities.length > 0 && (
          <section>
            <h3 className="mb-2 font-semibold text-slate-700">
              Investing Activities{' '}
              <span className="text-sm font-normal text-slate-400">(closing balances)</span>
            </h3>
            {cf.investingActivities.map((item, i) => (
              <AmountRow key={i} label={item.label} amount={item.amount} />
            ))}
            <SubtotalRow label="Total Non-Current Assets (net book value)" amount={cf.investingActivitiesTotal} />
          </section>
        )}

        {cf.financingActivities.length > 0 && (
          <section>
            <h3 className="mb-2 font-semibold text-slate-700">
              Financing Activities{' '}
              <span className="text-sm font-normal text-slate-400">(closing balances)</span>
            </h3>
            {cf.financingActivities.map((item, i) => (
              <AmountRow key={i} label={item.label} amount={item.amount} />
            ))}
            <SubtotalRow label="Total Long-Term Liabilities" amount={cf.financingActivitiesTotal} />
          </section>
        )}

        <section>
          <h3 className="mb-2 font-semibold text-slate-700">Cash Position</h3>
          <AmountRow label="Opening Cash (not available — single period)" amount={cf.openingCash} />
          <TotalRow label="Closing Cash Balance" amount={cf.closingCash} />
        </section>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialStatementPage({ params }: { params: { trialBalanceId: string } }) {
  const [data, setData] = useState<FinancialStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('income');

  useEffect(() => {
    fetch(`/api/financial-statements/${params.trialBalanceId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.trialBalanceId]);

  if (loading || !data) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-slate-500">Loading financial statements...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'income', label: 'Income Statement' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Statements</h1>
          <p className="text-slate-600">{data.company.name}</p>
          <p className="text-sm text-slate-500">Period ended: {formatDate(data.periodEnd)}</p>
        </div>
        <Link href={`/companies/${data.companyId}`}>
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <div className="flex gap-1 rounded-lg border bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'income' && <IncomeStatementTab is={data.incomeStatement} />}
      {activeTab === 'balance' && <BalanceSheetTab bs={data.balanceSheet} />}
      {activeTab === 'cashflow' && <CashFlowTab cf={data.cashFlow} />}

      <p className="text-center text-xs text-slate-400">
        Statements are derived from the uploaded trial balance. Generated:{' '}
        {formatDate(data.generatedAt)}.
      </p>
    </div>
  );
}
