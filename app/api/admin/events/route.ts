import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';

const createEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// get all events
export async function GET() {
  try {
    await requireAuth();

    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(events);
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

// create new event
export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const { name, description } = createEventSchema.parse(body);

    // check if name already exists
    const existing = await prisma.event.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'event name already exists' },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(event, { status: 201 });
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