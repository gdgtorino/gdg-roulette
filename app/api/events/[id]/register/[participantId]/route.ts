import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { EventStatus } from '@prisma/client';

// cancel registration
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id, participantId } = await params;

    // check event status
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: 'event not found' }, { status: 404 });
    }

    if (event.status !== EventStatus.REGISTRATION_OPEN) {
      return NextResponse.json(
        { error: 'cannot cancel registration after registration is closed' },
        { status: 400 }
      );
    }

    // delete participant
    await prisma.participant.delete({
      where: { id: participantId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}