import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { EventStatus } from '@prisma/client';

const updateEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// get event details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        participants: {
          orderBy: { registeredAt: 'asc' },
        },
        winners: {
          include: {
            participant: true,
          },
          orderBy: { drawOrder: 'asc' },
        },
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

// update event (only in INIT status)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'event not found' }, { status: 404 });
    }

    if (event.status !== EventStatus.INIT) {
      return NextResponse.json(
        { error: 'cannot edit event after it has been opened' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description } = updateEventSchema.parse(body);

    // check if name already exists (excluding current event)
    const existing = await prisma.event.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'event name already exists' },
        { status: 400 }
      );
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
    });

    return NextResponse.json(updated);
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

// delete event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.event.delete({
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