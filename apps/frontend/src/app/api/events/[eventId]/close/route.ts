import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

// Close event (end extraction) (protected)
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
        { error: 'Not authorized to close this event' },
        { status: 403 }
      );
    }

    await redisService.updateEventClosed(params.eventId, true);

    // TODO: Emit real-time update using Server-Sent Events
    // This will be implemented when we set up SSE

    return NextResponse.json({ closed: true });
  } catch (error) {
    console.error('Close event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}