import { NextRequest } from 'next/server';

// Store for active SSE connections
const connections = new Map<string, Set<WritableStreamDefaultWriter>>();

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const writer = controller;

      // Add connection to the event room
      if (!connections.has(eventId)) {
        connections.set(eventId, new Set());
      }
      connections.get(eventId)?.add(writer as any);

      // Send initial connection message
      const encoder = new TextEncoder();
      writer.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', eventId })}\n\n`));

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        connections.get(eventId)?.delete(writer as any);
        if (connections.get(eventId)?.size === 0) {
          connections.delete(eventId);
        }
        writer.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Helper function to broadcast messages to all connections in an event room
export function broadcastToEvent(eventId: string, data: any) {
  const eventConnections = connections.get(eventId);
  if (!eventConnections) return;

  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

  // Send to all connections in the event room
  eventConnections.forEach((writer) => {
    try {
      writer.write(message);
    } catch (error) {
      // Remove broken connections
      eventConnections.delete(writer);
    }
  });

  // Clean up empty event rooms
  if (eventConnections.size === 0) {
    connections.delete(eventId);
  }
}