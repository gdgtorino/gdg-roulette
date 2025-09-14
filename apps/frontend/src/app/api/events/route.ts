import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '@/lib/redis';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';
import type { Event } from '@/lib/types';

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long')
});

// Get all events for admin (protected)
export async function GET(request: NextRequest) {
  const admin = validateAuth(request);

  if (!admin) {
    return createAuthResponse('Access token required');
  }

  try {
    const events = await redisService.getAdminEvents(admin.adminId);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new event (protected)
export async function POST(request: NextRequest) {
  const admin = validateAuth(request);

  if (!admin) {
    return createAuthResponse('Access token required');
  }

  try {
    const body = await request.json();
    const { name } = CreateEventSchema.parse(body);

    const eventId = uuidv4();
    const qrData = `${process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL}/register/${eventId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const event: Event = {
      id: eventId,
      name,
      createdBy: admin.adminId,
      createdAt: new Date(),
      registrationOpen: true,
      closed: false,
      qrCode
    };

    await redisService.createEvent(event);

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}