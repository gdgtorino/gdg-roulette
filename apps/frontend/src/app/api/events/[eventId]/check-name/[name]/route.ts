import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';

// Check if name is available (public endpoint)
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

    if (!event.registrationOpen) {
      return NextResponse.json({
        available: false,
        reason: 'Registration closed'
      });
    }

    const isNameTaken = await redisService.isParticipantNameTaken(eventId, decodeURIComponent(name));

    return NextResponse.json({
      available: !isNameTaken,
      reason: isNameTaken ? 'Name already taken' : null
    });
  } catch (error) {
    console.error('Check name availability error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}