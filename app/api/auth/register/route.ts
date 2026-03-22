import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';
import bcrypt from 'bcryptjs';

// This endpoint creates an admin user. It is only available when no users exist.
export async function POST(request: Request) {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: 'Registration is disabled. Contact your administrator.' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const { email, password, name } = body;

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: typeof name === 'string' ? name.trim() : null,
        role: 'ADMIN',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('[API] Register error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
