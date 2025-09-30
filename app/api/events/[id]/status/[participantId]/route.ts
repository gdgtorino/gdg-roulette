import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// get participant status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const { id, participantId } = await params;

    const participant = await prisma.participant.findUnique({
      where: {
        id: participantId,
        eventId: id,
      },
      include: {
        event: {
          select: {
            status: true,
            _count: {
              select: {
                participants: true,
                winners: true,
              },
            },
          },
        },
        winner: true,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'participant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(participant);
  } catch {
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}