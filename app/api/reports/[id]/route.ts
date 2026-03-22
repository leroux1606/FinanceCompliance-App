import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const report = await prisma.complianceReport.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        trialBalance: { include: { checkResults: { include: { rule: true } } } },
      },
    });
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(report);
  } catch (error) {
    console.error('[API] Report fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}
