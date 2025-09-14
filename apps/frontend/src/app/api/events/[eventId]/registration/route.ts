import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

// Toggle event registration (protected)
export async function PATCH(
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
        { error: 'Not authorized to modify this event' },
        { status: 403 }
      );
    }

    const newStatus = !event.registrationOpen;
    await redisService.updateEventRegistration(params.eventId, newStatus);

    // Emit real-time update using Server-Sent Events
    const { emitRegistrationToggled } = await import('@/lib/sse');
    emitRegistrationToggled(params.eventId, newStatus);

    return NextResponse.json({ registrationOpen: newStatus });
  } catch (error) {
    console.error('Toggle registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}