import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import { requireSession } from '@/src/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const unauth = await requireSession();
  if (unauth) return unauth;

  // Only admins can toggle rules
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled (boolean) is required' }, { status: 400 });
    }

    const rule = await prisma.complianceRule.update({
      where: { id: params.id },
      data: { enabled: body.enabled },
    });
    return NextResponse.json(rule);
  } catch (error) {
    console.error('[API] Rule toggle error:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
