import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/jwt';

const setPasswordSchema = z.object({
  password: z.string().min(6),
});

// set admin password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { password } = setPasswordSchema.parse(body);

    // hash password and update
    const hashedPassword = await hashPassword(password);
    await prisma.admin.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}