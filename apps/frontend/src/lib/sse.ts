// Helper functions to emit Server-Sent Events
import { broadcastToEvent } from '@/app/api/events/[eventId]/stream/route';

export function emitParticipantRegistered(eventId: string, participant: any) {
  broadcastToEvent(eventId, {
    type: 'participantRegistered',
    data: participant
  });
}

export function emitRegistrationToggled(eventId: string, registrationOpen: boolean) {
  broadcastToEvent(eventId, {
    type: 'registrationToggled',
    data: { registrationOpen }
  });
}

export function emitEventClosed(eventId: string) {
  broadcastToEvent(eventId, {
    type: 'eventClosed',
    data: { closed: true }
  });
}

export function emitWinnerDrawn(eventId: string, winner: any) {
  broadcastToEvent(eventId, {
    type: 'winnerDrawn',
    data: winner
  });
}

// Client-side hook for connecting to SSE
export function useEventStream(eventId: string, onMessage: (data: any) => void) {
  if (typeof window === 'undefined') return;

  const eventSource = new EventSource(`/api/events/${eventId}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
  };

  return () => {
    eventSource.close();
  };
}