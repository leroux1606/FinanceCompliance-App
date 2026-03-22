'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const INDUSTRIES = [
  'Agriculture',
  'Construction',
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Mining',
  'Retail',
  'Services',
  'Technology',
  'Wholesale and Retail',
  'Other',
];

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [financialYearEnd, setFinancialYearEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          industry,
          financialYearEnd: financialYearEnd || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');
      router.push(`/companies/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Add Company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
              placeholder="e.g. Acme (Pty) Ltd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            >
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Financial year-end (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={financialYearEnd}
              onChange={(e) => setFinancialYearEnd(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
