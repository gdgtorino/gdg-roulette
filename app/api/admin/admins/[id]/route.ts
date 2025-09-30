import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

const updateAdminSchema = z.object({
  username: z.string().min(1),
});

// update admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { username } = updateAdminSchema.parse(body);

    // check if username already exists (excluding current admin)
    const existing = await prisma.admin.findFirst({
      where: {
        username,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'username already exists' },
        { status: 400 }
      );
    }

    // prevent admin from updating themselves (optional, can be allowed)
    const admin = await prisma.admin.update({
      where: { id },
      data: { username },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(admin);
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

// delete admin
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentAdmin = await requireAuth();
    const { id } = await params;

    // prevent admin from deleting themselves
    if (currentAdmin.adminId === id) {
      return NextResponse.json(
        { error: 'cannot delete yourself' },
        { status: 400 }
      );
    }

    await prisma.admin.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
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