'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, FileCheck, BarChart3, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  companies: number;
  trialBalances: number;
  avgScore: number;
  recentReports: {
    id: string;
    companyId: string;
    companyName: string;
    score: number;
    riskLevel: string;
    generatedAt: string;
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data: DashboardStats) => setStats(data))
      .catch(() =>
        setStats({ companies: 0, trialBalances: 0, avgScore: 0, recentReports: [] })
      );
  }, []);

  const lastReport = stats?.recentReports[0];

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold text-slate-800">
        South African Financial Compliance
      </h1>
      <p className="mb-8 text-slate-600">
        Assess financial compliance and audit readiness aligned with IFRS, Companies Act, and SARS.
      </p>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.companies ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Trial Balances</CardTitle>
            <FileCheck className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.trialBalances ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Compliance</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats != null ? `${stats.avgScore}%` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Last Report</CardTitle>
            <Shield className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {lastReport ? (
                <Link
                  href={`/report/${lastReport.id}`}
                  className="text-emerald-600 hover:underline"
                >
                  {lastReport.companyName}: {lastReport.score}%
                </Link>
              ) : (
                <span className="text-slate-400">No reports yet</span>
              )}
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
            <p className="text-sm text-slate-600">1. Add a company with industry and financial year-end</p>
            <p className="text-sm text-slate-600">2. Upload a trial balance (CSV or Excel)</p>
            <p className="text-sm text-slate-600">3. Run compliance checks and view the report</p>
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
            <ul className="space-y-1 text-sm text-slate-600">
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
