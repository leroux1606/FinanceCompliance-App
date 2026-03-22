'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Rule {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  severity: string;
  enabled: boolean;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/rules')
      .then((r) => r.json())
      .then((data: Rule[]) => setRules(data))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggleRule(rule: Rule) {
    setToggling(rule.id);
    try {
      const res = await fetch(`/api/admin/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (res.ok) {
        const updated = await res.json() as Rule;
        setRules((prev) => prev.map((r) => (r.id === updated.id ? { ...r, enabled: updated.enabled } : r)));
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Configuration</h1>
        <p className="text-slate-600">
          View and manage compliance rules used by the SA Compliance Check Engine.
        </p>
        {!isAdmin && (
          <p className="mt-2 text-sm text-amber-600">
            You have read-only access. Admin role required to toggle rules.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
          <p className="text-sm text-slate-500">
            IFRS, Companies Act, and SARS tax checks. Disabled rules are skipped during compliance
            checks.
          </p>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-slate-500">No rules found. Run: pnpm run db:seed</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Compliance rules">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs text-slate-600">{r.code}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{r.category}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            r.severity === 'HIGH'
                              ? 'danger'
                              : r.severity === 'MEDIUM'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {r.severity}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => toggleRule(r)}
                            disabled={toggling === r.id}
                            aria-label={`${r.enabled ? 'Disable' : 'Enable'} rule ${r.name}`}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              r.enabled
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            } disabled:opacity-50`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                r.enabled ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}
                            />
                            {toggling === r.id ? 'Saving...' : r.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        ) : (
                          <Badge variant={r.enabled ? 'success' : 'secondary'}>
                            {r.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring Logic</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            Overall compliance score is calculated from individual check risk scores. Risk level:{' '}
            <strong>High</strong> (score &lt; 60% or any HIGH_RISK check),{' '}
            <strong>Medium</strong> (2+ warnings or score &lt; 80%),{' '}
            <strong>Low</strong> (otherwise).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
