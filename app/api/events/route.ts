import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { validateRequest } from '@/lib/api/validation';
import { createEvent, getEvents } from '@/lib/events/mutations';

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional(),
  prizePool: z.number().positive().optional(),
  scheduledStart: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await validateRequest(request, createEventSchema);

    if (!body.success) {
      return NextResponse.json(
        { error: body.error },
        { status: 400 }
      );
    }

    const event = await createEvent(body.data.name);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}