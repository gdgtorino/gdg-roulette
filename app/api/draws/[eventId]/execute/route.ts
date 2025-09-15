import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { validateRequest } from '@/lib/api/validation';
import { executeDraw } from '@/lib/draws/mutations';

const executeDrawSchema = z.object({
  winnerCount: z.number().int().positive().max(100).optional(),
});

interface RouteParams {
  params: {
    eventId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const body = await validateRequest(request, executeDrawSchema);

    if (!body.success) {
      return NextResponse.json(
        { error: body.error },
        { status: 400 }
      );
    }

    const result = await executeDraw(params.eventId);

    return NextResponse.json({
      success: true,
      winner: result,
    });
  } catch (error) {
    console.error('Execute draw error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to execute draw' },
      { status: 500 }
    );
  }
}