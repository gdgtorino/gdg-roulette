'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Participant {
  id: string;
  eventId: string;
  name: string;
  registeredAt: string;
}

interface ParticipantsListLiveProps {
  eventId: string;
  initialParticipants: Participant[];
}

export function ParticipantsListLive({ eventId, initialParticipants }: ParticipantsListLiveProps) {
  const [participants, setParticipants] = useState(initialParticipants);

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onParticipantRegistered: (participant) => {
      console.log('New participant registered:', participant);
      setParticipants((prev) => [...prev, participant as Participant]);
    },
  });

  // Update participants when initialParticipants changes (e.g., after navigation)
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {participants.map((participant, index) => (
        <div
          key={participant.id}
          className="flex items-center justify-between p-3 border dark:border-gray-600 dark:bg-gray-700 rounded-lg"
        >
          <div>
            <div className="font-medium dark:text-white">
              #{index + 1} {participant.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(participant.registeredAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
      {participants.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No participants yet. Share the QR code to get started!
        </div>
      )}
    </div>
  );
}
