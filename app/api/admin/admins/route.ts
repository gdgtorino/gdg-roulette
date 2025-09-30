import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/jwt';

const createAdminSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});

// get all admins
export async function GET() {
  try {
    await requireAuth();

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(admins);
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}

// create new admin
export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const { username, password } = createAdminSchema.parse(body);

    // check if username already exists
    const existing = await prisma.admin.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'username already exists' },
        { status: 400 }
      );
    }

    // hash password and create admin
    const hashedPassword = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(admin, { status: 201 });
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