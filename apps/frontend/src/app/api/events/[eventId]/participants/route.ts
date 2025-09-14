import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';
import { generatePassphrase } from '@/lib/passphrase';
import type { Participant } from '@/lib/types';

const RegisterParticipantSchema = z.object({
  name: z.string().min(1).max(50).optional()
});

// Get event participants (protected)
export async function GET(
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
        { error: 'Not authorized to view participants' },
        { status: 403 }
      );
    }

    const participants = await redisService.getEventParticipants(params.eventId);
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Register participant (public endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await redisService.getEvent(params.eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.registrationOpen) {
      return NextResponse.json(
        { error: 'Registration is closed for this event' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = RegisterParticipantSchema.parse(body);
    const participantName = name || generatePassphrase();

    // Check if name is already taken
    const isNameTaken = await redisService.isParticipantNameTaken(params.eventId, participantName);
    if (isNameTaken) {
      return NextResponse.json(
        { error: 'Name already taken for this event' },
        { status: 400 }
      );
    }

    const participant: Participant = {
      id: uuidv4(),
      eventId: params.eventId,
      name: participantName,
      registeredAt: new Date()
    };

    await redisService.addParticipant(participant);

    // TODO: Emit real-time update using Server-Sent Events
    // This will be implemented when we set up SSE

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Register participant error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}