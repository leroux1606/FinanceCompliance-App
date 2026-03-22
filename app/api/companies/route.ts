import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';

export async function GET(request: Request) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          trialBalances: {
            orderBy: { uploadedAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.company.count(),
    ]);

    return NextResponse.json({
      data: companies,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[API] Companies list error:', error);
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { name, industry, financialYearEnd } = body;

    if (!name || !industry || !financialYearEnd) {
      return NextResponse.json(
        { error: 'Name, industry, and financial year-end are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name: String(name).trim(),
        industry: String(industry).trim(),
        financialYearEnd: String(financialYearEnd).trim(),
      },
    });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company create error:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
