import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest } from '@/lib/api/validation';
import { registerParticipant } from '@/lib/participants/mutations';

const registerSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await validateRequest(request, registerSchema);

    if (!body.success) {
      return NextResponse.json(
        { error: body.error },
        { status: 400 }
      );
    }

    const participant = await registerParticipant(body.data.eventId, body.data.name);

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    console.error('Register participant error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to register participant' },
      { status: 500 }
    );
  }
}