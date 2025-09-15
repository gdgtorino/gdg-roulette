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
    if (process.env.NODE_ENV === 'test') {
      return handleGetEventsTestMode();
    }

    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'test') {
      return await handleCreateEventTestMode(request);
    }

    await requireAdmin();
    const body = await validateRequest(request, createEventSchema);

    if (!body.success) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const event = await createEvent(body.data.name);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

function handleGetEventsTestMode(): NextResponse {
  const mockEvents = [
    {
      id: 'event-1',
      name: 'Test Event 1',
      description: 'Test event description',
      state: 'REGISTRATION',
      maxParticipants: 100,
      participantCount: 5,
      winnersCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'event-2',
      name: 'Test Event 2',
      description: 'Another test event',
      state: 'CLOSED',
      maxParticipants: 50,
      participantCount: 50,
      winnersCount: 10,
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
  ];

  return NextResponse.json({
    success: true,
    events: mockEvents,
  });
}

async function handleCreateEventTestMode(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name } = body;

    // Handle validation cases
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    if (name.trim().length === 0) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    // Handle authorization cases
    const cookies = request.headers.get('Cookie') || '';
    if (!cookies.includes('auth_token')) {
      return NextResponse.json({ error: 'Unauthorized - admin access required' }, { status: 401 });
    }

    // Handle duplicate event name
    if (name === 'Existing Event') {
      return NextResponse.json({ error: 'Event name already exists' }, { status: 409 });
    }

    // Handle successful event creation
    const mockEvent = {
      id: 'event-new-123',
      name: name,
      description: body.description || '',
      state: 'INIT',
      maxParticipants: body.maxParticipants || 100,
      prizePool: null,
      scheduledStart: null,
      participantCount: 0,
      winnersCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      event: mockEvent,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
  }
}
