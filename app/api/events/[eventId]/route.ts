import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { validateRequest } from '@/lib/api/validation';
import { getEvent, updateEvent, deleteEvent } from '@/lib/events/mutations';

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional(),
  prizePool: z.number().positive().optional(),
  status: z.enum(['draft', 'registration', 'drawing', 'completed']).optional(),
});

interface RouteParams {
  params: {
    eventId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const event = await getEvent(params.eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const body = await validateRequest(request, updateEventSchema);

    if (!body.success) {
      return NextResponse.json(
        { error: body.error },
        { status: 400 }
      );
    }

    const event = await updateEvent(params.eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();

    const success = await deleteEvent(params.eventId);

    if (!success) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}