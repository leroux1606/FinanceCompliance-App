import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';

export async function GET() {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const rules = await prisma.complianceRule.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error('[API] Rules fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}
