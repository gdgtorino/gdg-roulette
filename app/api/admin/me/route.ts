import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // get full admin details from database
    const adminData = await prisma.admin.findUnique({
      where: { id: admin.adminId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!adminData) {
      return NextResponse.json({ error: 'admin not found' }, { status: 404 });
    }

    return NextResponse.json(adminData);
  } catch {
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}