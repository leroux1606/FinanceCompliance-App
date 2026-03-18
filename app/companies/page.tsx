'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
interface Company {
  id: string;
  name: string;
  industry: string;
  financialYearEnd: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    fetch('/api/companies')
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Companies</h1>
        <Link href="/companies/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        </Link>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 mb-4">No companies yet</p>
            <Link href="/companies/new">
              <Button>Add your first company</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                    View <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
