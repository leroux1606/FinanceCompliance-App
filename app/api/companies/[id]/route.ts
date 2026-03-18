import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        trialBalances: {
          orderBy: { uploadedAt: 'desc' },
          include: { checkResults: { include: { rule: true } } },
        },
        reports: { orderBy: { generatedAt: 'desc' }, include: { company: true } },
      },
    });
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const company = await prisma.company.update({
      where: { id: params.id },
      data: body,
    });
    return NextResponse.json(company);
  } catch (error) {
    console.error('[API] Company update error:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.company.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Company delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
