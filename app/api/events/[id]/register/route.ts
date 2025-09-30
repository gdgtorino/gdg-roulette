import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { EventStatus } from '@prisma/client';

const registerSchema = z.object({
  name: z.string().min(1),
});

// register participant
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'event not found' }, { status: 404 });
    }

    if (event.status !== EventStatus.REGISTRATION_OPEN) {
      return NextResponse.json(
        { error: 'registration is not open' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = registerSchema.parse(body);

    // check if name is unique within event
    const existing = await prisma.participant.findUnique({
      where: {
        eventId_name: {
          eventId: id,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'name already registered for this event' },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.create({
      data: {
        name,
        eventId: id,
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}