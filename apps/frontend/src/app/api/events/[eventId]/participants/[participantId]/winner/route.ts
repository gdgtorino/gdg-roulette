import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';

// Check if participant is winner (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; participantId: string } }
) {
  try {
    const { eventId, participantId } = params;

    const event = await redisService.getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const winners = await redisService.getEventWinners(eventId);
    const winner = winners.find(w => w.participantId === participantId);

    if (winner) {
      return NextResponse.json(winner);
    } else {
      return NextResponse.json({ isWinner: false });
    }
  } catch (error) {
    console.error('Check winner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}