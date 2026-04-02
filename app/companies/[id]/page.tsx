'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Company {
  id: string;
  name: string;
  industry: string;
  financialYearEnd: string;
  trialBalances: {
    id: string;
    periodEnd: string;
    uploadedAt: string;
    financialStatement: { id: string } | null;
  }[];
  reports: { id: string; trialBalanceId: string; complianceScore: number; riskLevel: string; generatedAt: string }[];
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/companies/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCompany(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading || !company) {
    return (
      <div className="flex min-h-[200px] items-center justify-center" role="status" aria-label="Loading company details">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-slate-600">{company.industry}</p>
          <p className="text-sm text-slate-500">
            Financial year-end: {new Date(company.financialYearEnd).toLocaleDateString('en-ZA')}
          </p>
        </div>
        <Link href={`/companies/${company.id}/upload`}>
          <Button>Upload Trial Balance</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trial Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {company.trialBalances.length === 0 ? (
              <p className="text-slate-500">No trial balances uploaded yet.</p>
            ) : (
              <ul className="space-y-3" aria-label="Trial balances list">
                {company.trialBalances.map((tb) => (
                  <li key={tb.id} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">
                      Period: {new Date(tb.periodEnd).toLocaleDateString('en-ZA')}
                    </span>
                    {(() => {
                      const report = company.reports.find((r) => r.trialBalanceId === tb.id);
                      return report ? (
                        <Link href={`/report/${report.id}`}>
                          <Button variant="outline" size="sm" aria-label={`View report for period ${new Date(tb.periodEnd).toLocaleDateString('en-ZA')}`}>
                            View Report
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled aria-label="No report available">
                          No Report
                        </Button>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Statements</CardTitle>
          </CardHeader>
          <CardContent>
            {company.trialBalances.filter((tb) => tb.financialStatement).length === 0 ? (
              <p className="text-slate-500">No financial statements generated yet.</p>
            ) : (
              <ul className="space-y-3">
                {company.trialBalances
                  .filter((tb) => tb.financialStatement)
                  .map((tb) => (
                    <li key={tb.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">
                        Period: {new Date(tb.periodEnd).toLocaleDateString('en-ZA')}
                      </span>
                      <Link href={`/financial-statement/${tb.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {company.reports.length === 0 ? (
              <p className="text-slate-500">No reports generated yet.</p>
            ) : (
              <ul className="space-y-3">
                {company.reports.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium">{r.complianceScore}%</span>
                      <Badge
                        variant={r.riskLevel === 'HIGH' ? 'danger' : r.riskLevel === 'MEDIUM' ? 'warning' : 'default'}
                        className="ml-2"
                      >
                        {r.riskLevel}
                      </Badge>
                    </div>
                    <Link href={`/report/${r.id}`}>
                      <Button variant="outline" size="sm">
                        View / PDF
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
