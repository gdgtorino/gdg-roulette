import { useEffect, useState, useRef } from 'react';

export interface SSEEvent {
  type: string;
  data: any;
  timestamp: number;
}

export function useEventSSE(eventId: string, enabled: boolean = true) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !eventId) {
      return;
    }

    const connectSSE = () => {
      try {
        const eventSource = new EventSource(`/api/events/${eventId}/sse`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const sseEvent: SSEEvent = {
              type: event.type || 'message',
              data,
              timestamp: Date.now(),
            };
            setEvents((prev) => [...prev, sseEvent]);
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = (err) => {
          setIsConnected(false);
          setError(new Error('SSE connection error'));
          console.error('SSE error:', err);
        };

        // Custom event listeners
        eventSource.addEventListener('participant-joined', (event) => {
          const data = JSON.parse(event.data);
          setEvents((prev) => [
            ...prev,
            {
              type: 'participant-joined',
              data,
              timestamp: Date.now(),
            },
          ]);
        });

        eventSource.addEventListener('draw-started', (event) => {
          const data = JSON.parse(event.data);
          setEvents((prev) => [
            ...prev,
            {
              type: 'draw-started',
              data,
              timestamp: Date.now(),
            },
          ]);
        });

        eventSource.addEventListener('winner-drawn', (event) => {
          const data = JSON.parse(event.data);
          setEvents((prev) => [
            ...prev,
            {
              type: 'winner-drawn',
              data,
              timestamp: Date.now(),
            },
          ]);
        });
      } catch (err) {
        setError(err as Error);
        setIsConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [eventId, enabled]);

  const clearEvents = () => {
    setEvents([]);
  };

  const getLatestEvent = (type?: string) => {
    if (type) {
      return events.filter((e) => e.type === type).slice(-1)[0];
    }
    return events.slice(-1)[0];
  };

  return {
    events,
    isConnected,
    error,
    clearEvents,
    getLatestEvent,
  };
}
