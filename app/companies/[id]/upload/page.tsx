'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function UploadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [periodEnd, setPeriodEnd] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !periodEnd) {
      setError('Please select a file and period end date.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', params.id);
    formData.append('periodEnd', periodEnd);

    try {
      const res = await fetch('/api/trial-balance/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Upload failed');
        return;
      }

      if (data.reportId) {
        router.push(`/report/${data.reportId}`);
      } else {
        router.push(`/companies/${params.id}`);
      }
    } catch (err) {
      setError('Failed to upload. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const fyEnd = new Date();
  fyEnd.setMonth(fyEnd.getMonth() - 1);
  const defaultPeriod = fyEnd.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/companies/${params.id}`} className="text-emerald-600 hover:underline">
          ← Back to company
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Trial Balance</CardTitle>
          <p className="text-sm text-slate-500">
            Upload a CSV or Excel file with columns: accountCode (or code), accountName (or name),
            debit, credit. Ensure debits equal credits.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Period end date
              </label>
              <input
                type="date"
                value={periodEnd || defaultPeriod}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                File (CSV or Excel)
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 file:mr-4 file:rounded file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-emerald-700"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Processing...' : 'Upload & Run Compliance'}
              </Button>
              <Link href={`/companies/${params.id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
