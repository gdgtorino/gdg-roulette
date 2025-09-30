import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { EventStatus } from '@prisma/client';

const statusSchema = z.object({
  status: z.nativeEnum(EventStatus),
});

// transition event status
export async function POST(
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

    const body = await request.json();
    const { status } = statusSchema.parse(body);

    // validate status transition
    const validTransitions: Record<EventStatus, EventStatus[]> = {
      [EventStatus.INIT]: [EventStatus.REGISTRATION_OPEN],
      [EventStatus.REGISTRATION_OPEN]: [EventStatus.REGISTRATION_CLOSED],
      [EventStatus.REGISTRATION_CLOSED]: [
        EventStatus.REGISTRATION_OPEN,
        EventStatus.DRAWING,
      ],
      [EventStatus.DRAWING]: [EventStatus.CLOSED],
      [EventStatus.CLOSED]: [],
    };

    if (!validTransitions[event.status]?.includes(status)) {
      return NextResponse.json(
        { error: 'invalid status transition' },
        { status: 400 }
      );
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status },
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