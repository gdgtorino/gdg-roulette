'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEventSSE } from '@/hooks/useEventSSE';

interface WaitingRoomProps {
  eventId?: string;
  participantId?: string;
}

export function WaitingRoom({ eventId, participantId }: WaitingRoomProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [eventStatus, setEventStatus] = useState<string>('registration');
  const router = useRouter();

  // Subscribe to real-time updates via Server-Sent Events
  const { isConnected, lastEvent } = useEventSSE(eventId);

  useEffect(() => {
    if (lastEvent) {
      switch (lastEvent.type) {
        case 'participant_joined':
          setParticipants(prev => [...prev, lastEvent.data]);
          break;
        case 'participant_left':
          setParticipants(prev =>
            prev.filter(p => p.id !== lastEvent.data.participantId)
          );
          break;
        case 'event_status_changed':
          setEventStatus(lastEvent.data.status);
          if (lastEvent.data.status === 'drawing') {
            router.push(`/events/${eventId}/draw`);
          } else if (lastEvent.data.status === 'completed') {
            router.push(`/events/${eventId}/results`);
          }
          break;
        case 'draw_started':
          router.push(`/events/${eventId}/draw`);
          break;
      }
    }
  }, [lastEvent, eventId, router]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Waiting for Draw to Begin
        </h2>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <span className="text-lg font-semibold text-blue-900">
            Current Participants
          </span>
          <span className="text-2xl font-bold text-blue-600">
            {participants.length}
          </span>
        </div>

        {eventStatus === 'registration' && (
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <LoadingSpinner size="sm" className="mb-2" />
            <p className="text-yellow-800">
              Registration is still open. More participants can join!
            </p>
          </div>
        )}

        {eventStatus === 'drawing' && (
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <LoadingSpinner size="sm" className="mb-2" />
            <p className="text-green-800">
              Draw is starting! Please wait...
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Participants
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {participants.slice(-10).map((participant, index) => (
            <div
              key={participant.id || index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm text-gray-900">
                {participant.name}
              </span>
              <span className="text-xs text-gray-500">
                Just joined
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}