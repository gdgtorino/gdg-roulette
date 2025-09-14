import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';

// Check if user already registered by name (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; name: string } }
) {
  try {
    const { eventId, name } = params;

    const event = await redisService.getEvent(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const participants = await redisService.getEventParticipants(eventId);
    const decodedName = decodeURIComponent(name);
    const participant = participants.find(p => p.name.toLowerCase() === decodedName.toLowerCase());

    if (participant) {
      return NextResponse.json({
        found: true,
        participantId: participant.id,
        name: participant.name
      });
    } else {
      return NextResponse.json({ found: false });
    }
  } catch (error) {
    console.error('Find participant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}