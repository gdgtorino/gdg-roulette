import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';
import { validateAuth, createAuthResponse } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const admin = validateAuth(request);

  if (!admin) {
    return createAuthResponse('Access token required');
  }

  const { eventId } = params;

  try {
    const event = await databaseService.getEvent(eventId);
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

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const winners = await databaseService.getEventWinners(eventId);

          // Stream winners one by one
          for (const winner of winners) {
            const chunk = JSON.stringify(winner) + '\n';
            controller.enqueue(encoder.encode(chunk));

            // Add a small delay to demonstrate streaming
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream winners error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}