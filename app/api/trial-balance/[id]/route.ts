import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tb = await prisma.trialBalance.findUnique({
      where: { id: params.id },
      include: {
        entries: true,
        checkResults: { include: { rule: true } },
        company: true,
      },
    });
    if (!tb) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(tb);
  } catch (error) {
    console.error('[API] Trial balance fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trial balance' },
      { status: 500 }
    );
  }
}
