import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';

// Get participant details (public endpoint for waiting page)
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

    const participants = await redisService.getEventParticipants(eventId);
    const participant = participants.find(p => p.id === participantId);

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      );
    }

    // Return only safe participant data
    return NextResponse.json({
      id: participant.id,
      name: participant.name,
      eventId: participant.eventId,
      registeredAt: participant.registeredAt
    });
  } catch (error) {
    console.error('Get participant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}