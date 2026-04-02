import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';
import type { FinancialStatementsResult } from '@/src/lib/financial-engine';

export async function GET(
  _request: Request,
  { params }: { params: { trialBalanceId: string } }
) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const record = await prisma.financialStatement.findUnique({
      where: { trialBalanceId: params.trialBalanceId },
      include: { company: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Financial statements not found' }, { status: 404 });
    }

    const data: FinancialStatementsResult = JSON.parse(record.dataJson);

    return NextResponse.json({
      id: record.id,
      trialBalanceId: record.trialBalanceId,
      companyId: record.companyId,
      company: record.company,
      periodEnd: record.periodEnd,
      generatedAt: record.generatedAt,
      ...data,
    });
  } catch (error) {
    console.error('[API] Financial statements fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial statements' },
      { status: 500 }
    );
  }
}
