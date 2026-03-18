'use client';

import { useEffect, useState } from 'react';
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
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/rules')
      .then((r) => r.json())
      .then(setRules)
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Configuration</h1>
        <p className="text-slate-600">
          View and manage compliance rules. Rules are used by the South Africa Compliance Check
          Engine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compliance Rules</CardTitle>
          <p className="text-sm text-slate-500">
            IFRS, Companies Act, and SARS tax checks. Enable/disable as needed for future regulatory
            updates.
          </p>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-slate-500">No rules found. Run: pnpm run db:seed</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3 font-mono text-slate-600">{r.code}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">{r.category}</Badge>
                      </td>
                      <td className="p-3">{r.severity}</td>
                      <td className="p-3">
                        <Badge variant={r.enabled ? 'default' : 'secondary'}>
                          {r.enabled ? 'Yes' : 'No'}
                        </Badge>
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
            Overall compliance score is calculated from individual check risk scores. Risk level is
            determined as: High (score &lt; 60% or any high-risk check), Medium (2+ warnings or score
            &lt; 80%), Low (otherwise). Adjustments can be made in the compliance engine
            configuration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
