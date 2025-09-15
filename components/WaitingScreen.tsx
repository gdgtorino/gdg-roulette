import React from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
}

interface Participant {
  id: string;
  name: string;
  eventId: string;
}

interface WaitingScreenProps {
  event: Event;
  participant?: Participant;
  participantCount?: number;
  liveUpdates?: boolean;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  event,
  participant,
  participantCount = 0,
  liveUpdates = false
}) => {
  return (
    <div>
      {participant && (
        <h2>Welcome, {participant.name}</h2>
      )}

      <h3>{event.name}</h3>

      {participantCount > 0 && (
        <p>{participantCount} participants registered</p>
      )}

      <p>Waiting for draw to begin</p>
      <p>You will be notified when the draw starts</p>
    </div>
  );
};