'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileCheck, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    companies: number;
    trialBalances: number;
    avgScore: number;
    lastReport?: { company: string; score: number };
  } | null>(null);

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then((companies: { id: string; name: string }[]) => {
        const companyIds = companies.map((c) => c.id);
        return Promise.all(
          companyIds.map((id) =>
            fetch(`/api/companies/${id}`).then((r) => r.json())
          )
        ).then((details) => ({
          companies: companies.length,
          trialBalances: details.reduce(
            (s, d) => s + (d.trialBalances?.length ?? 0),
            0
          ),
          details,
          companiesList: companies,
        }));
      })
      .then((data: { companies: number; trialBalances: number; details: { trialBalances?: { checkResults?: { rule?: { code: string }; status: string; riskScore: number }[]; company?: { name: string } }[]; reports?: { complianceScore: number }[] }[]; companiesList: { id: string; name: string }[] }) => {
        let totalScore = 0;
        let scoreCount = 0;
        let lastReport: { company: string; score: number } | undefined;

        for (const d of data.details) {
          const reports = (d as { reports?: { complianceScore: number; company?: { name: string } }[] }).reports;
          if (reports?.length) {
            const latest = reports[reports.length - 1];
            totalScore += latest.complianceScore;
            scoreCount++;
            lastReport = {
              company: (latest as { company?: { name: string } }).company?.name ?? data.companiesList.find((c) => c.id === (d as { id: string }).id)?.name ?? 'Unknown',
              score: latest.complianceScore,
            };
          }
        }

        setStats({
          companies: data.companies,
          trialBalances: data.trialBalances,
          avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
          lastReport,
        });
      })
      .catch(() => setStats({ companies: 0, trialBalances: 0, avgScore: 0 }));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">
        South African Financial Compliance
      </h1>
      <p className="text-slate-600 mb-8">
        Assess financial compliance and audit readiness aligned with IFRS, Companies Act, and SARS.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Companies
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.companies ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Trial Balances
            </CardTitle>
            <FileCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.trialBalances ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg Compliance %
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgScore ?? 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Last Report
            </CardTitle>
            <Shield className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {stats?.lastReport
                ? `${stats.lastReport.company}: ${stats.lastReport.score}%`
                : 'No reports yet'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">
              1. Add a company with industry and financial year-end
            </p>
            <p className="text-sm text-slate-600">
              2. Upload a trial balance (CSV or Excel)
            </p>
            <p className="text-sm text-slate-600">
              3. Run compliance checks and view the report
            </p>
            <Link href="/companies">
              <Button>Manage Companies</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compliance Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• IFRS-aligned financial statement checks</li>
              <li>• Companies Act completeness indicators</li>
              <li>• SARS VAT, PAYE, Provisional tax checks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
