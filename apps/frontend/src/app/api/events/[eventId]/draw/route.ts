import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';
import type { Winner } from '@/lib/types';

// Draw winner (protected)
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const admin = validateAuth(request);

  if (!admin) {
    return createAuthResponse('Access token required');
  }

  try {
    const event = await redisService.getEvent(params.eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (event.createdBy !== admin.adminId) {
      return NextResponse.json(
        { error: 'Not authorized to draw for this event' },
        { status: 403 }
      );
    }

    if (event.registrationOpen) {
      return NextResponse.json(
        { error: 'Close registration before drawing' },
        { status: 400 }
      );
    }

    const participants = await redisService.getEventParticipants(params.eventId);
    const winners = await redisService.getEventWinners(params.eventId);

    // Filter out already drawn participants
    const availableParticipants = participants.filter(
      p => !winners.some(w => w.participantId === p.id)
    );

    if (availableParticipants.length === 0) {
      return NextResponse.json(
        { error: 'No participants available to draw' },
        { status: 400 }
      );
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedParticipant = availableParticipants[randomIndex];

    const winner: Winner = {
      id: uuidv4(),
      eventId: params.eventId,
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      drawOrder: winners.length + 1,
      drawnAt: new Date()
    };

    await redisService.addWinner(winner);

    // Emit real-time update using Server-Sent Events
    const { emitWinnerDrawn } = await import('@/lib/sse');
    emitWinnerDrawn(params.eventId, winner);

    return NextResponse.json(winner);
  } catch (error) {
    console.error('Draw winner error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}