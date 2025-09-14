import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

// Get event details (public endpoint)
export async function GET(
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

    return NextResponse.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete event (protected)
export async function DELETE(
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
        { error: 'Not authorized to delete this event' },
        { status: 403 }
      );
    }

    await redisService.deleteEvent(params.eventId);
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}