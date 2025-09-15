import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sse } from '../../../../../lib/sse';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  const { eventId } = params;
  const clientId = uuidv4();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      const initialMessage = encoder.encode(
        `data: ${JSON.stringify({
          type: 'connected',
          clientId,
          message: 'Connected to event stream',
        })}\n\n`,
      );
      controller.enqueue(initialMessage);

      // Add client to SSE service
      sse.addClient(eventId, controller, clientId);

      console.log(`Client ${clientId} connected to event ${eventId} SSE stream`);
    },
    cancel() {
      // Remove client when connection is closed
      sse.removeClient(eventId, clientId);
      console.log(`Client ${clientId} disconnected from event ${eventId} SSE stream`);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
