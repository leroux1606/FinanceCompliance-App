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
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        trialBalances: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            checkResults: { include: { rule: true } },
            financialStatement: { select: { id: true } },
          },
        },
        reports: { orderBy: { generatedAt: 'desc' }, include: { company: true } },
      },
    });
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    const body = await request.json() as Record<string, unknown>;
    const { name, industry, financialYearEnd } = body;

    const updateData: { name?: string; industry?: string; financialYearEnd?: string } = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (typeof industry === 'string' && industry.trim()) updateData.industry = industry.trim();
    if (typeof financialYearEnd === 'string' && financialYearEnd.trim()) updateData.financialYearEnd = financialYearEnd.trim();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: updateData,
    });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company update error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  try {
    await prisma.company.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Company delete error:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
