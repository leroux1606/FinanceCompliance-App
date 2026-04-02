'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReportData {
  id: string;
  complianceScore: number;
  riskLevel: string;
  summaryJson: string;
  company: { id: string; name: string };
  trialBalance: {
    id: string;
    periodEnd: string;
    checkResults: {
      status: string;
      riskScore: number;
      message: string;
      rule: { name: string; category: string };
    }[];
  };
}

export default function ReportPage({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${params.id}`)
      .then((r) => r.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading || !report) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-slate-500">Loading report...</p>
      </div>
    );
  }

  const data = JSON.parse(report.summaryJson) as {
    executiveSummary?: string;
    issues?: { ruleName: string; message: string; status: string }[];
    recommendations?: string[];
  };

  const issues = report.trialBalance.checkResults.filter((r) => r.status !== 'COMPLIANT');

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Readiness Report</h1>
          <p className="text-slate-600">{report.company.name}</p>
          <p className="text-sm text-slate-500">
            Period: {new Date(report.trialBalance.periodEnd).toLocaleDateString('en-ZA')}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/${report.id}/pdf`} download>
            <Button>Download PDF</Button>
          </a>
          <Link href={`/financial-statement/${report.trialBalance.id}`}>
            <Button variant="outline">Financial Statements</Button>
          </Link>
          <Link href={`/companies/${report.company.id}`}>
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700">
            {data.executiveSummary ??
              'This report provides a compliance assessment aligned with IFRS, the South African Companies Act, and SARS tax requirements. It identifies risks and gaps to assist with audit preparation.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-700">{report.complianceScore}%</div>
            <Badge
              variant={
                report.riskLevel === 'HIGH' ? 'destructive' : report.riskLevel === 'MEDIUM' ? 'warning' : 'default'
              }
              className="mt-2"
            >
              Risk: {report.riskLevel}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Check Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.trialBalance.checkResults.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge
                    variant={
                      r.status === 'HIGH_RISK' ? 'danger' : r.status === 'WARNING' ? 'warning' : 'default'
                    }
                    className="shrink-0"
                  >
                    {r.status}
                  </Badge>
                  <span>{r.rule.name}: {r.message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5">
              {issues.map((r, i) => (
                <li key={i} className="text-slate-700">
                  <strong>{r.rule.name}:</strong> {r.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="text-slate-700">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-slate-500">
        This report is for audit preparation purposes only. It does not constitute legal or
        professional advice.
      </div>
    </div>
  );
}
