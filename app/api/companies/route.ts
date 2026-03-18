import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        trialBalances: {
          orderBy: { uploadedAt: 'desc' },
          take: 1,
        },
      },
    });
    return NextResponse.json(companies);
  } catch (error) {
    console.error('[API] Companies list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, industry, financialYearEnd } = body;

    if (!name || !industry || !financialYearEnd) {
      return NextResponse.json(
        { error: 'Name, industry, and financial year-end are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.create({
      data: { name, industry, financialYearEnd },
    });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company create error:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
}
