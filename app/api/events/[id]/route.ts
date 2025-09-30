import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// get public event info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}