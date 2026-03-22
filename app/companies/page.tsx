'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Company {
  id: string;
  name: string;
  industry: string;
  financialYearEnd: string;
}

interface PaginatedResponse {
  data: Company[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const PAGE_SIZE = 20;

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/companies?page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((res: PaginatedResponse) => {
        setCompanies(res.data ?? []);
        setTotalPages(res.pages ?? 1);
        setTotal(res.total ?? 0);
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
          {total > 0 && (
            <p className="text-sm text-slate-500">{total} {total === 1 ? 'company' : 'companies'}</p>
          )}
        </div>
        <Link href="/companies/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="mb-4 text-slate-600">No companies yet</p>
            <Link href="/companies/new">
              <Button>Add your first company</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {companies.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-600">
                      {c.industry} | Year-end: {c.financialYearEnd}
                    </p>
                  </div>
                  <Link href={`/companies/${c.id}`}>
                    <Button variant="outline" size="sm">
                      View <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
