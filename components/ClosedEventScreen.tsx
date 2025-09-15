import React from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
  closed: boolean;
}

interface ClosedEventScreenProps {
  event: Event;
}

export const ClosedEventScreen: React.FC<ClosedEventScreenProps> = ({ event }) => {
  return (
    <div>
      <h2>{event.name}</h2>
      <p>This event is closed</p>
      <p>Thank you for your interest</p>
    </div>
  );
};