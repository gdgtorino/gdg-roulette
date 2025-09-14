import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

// Get event winners (protected)
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
        { error: 'Not authorized to view winners' },
        { status: 403 }
      );
    }

    const winners = await redisService.getEventWinners(params.eventId);
    return NextResponse.json(winners);
  } catch (error) {
    console.error('Get winners error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}