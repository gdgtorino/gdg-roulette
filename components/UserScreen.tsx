import React from 'react';
import { RegistrationScreen } from './RegistrationScreen';
import { WaitingScreen } from './WaitingScreen';
import { LotteryScreen } from './LotteryScreen';
import { ResultScreen } from './ResultScreen';

interface Event {
  id: string;
  name: string;
  state: string;
  registrationOpen: boolean;
  closed: boolean;
}

interface UserState {
  status: string;
  screen: string;
}

interface UserScreenProps {
  event: Event;
  userState: UserState;
  onStateChange?: (newState: any) => void;
}

export const UserScreen: React.FC<UserScreenProps> = ({ event, userState, onStateChange }) => {
  // Check for unsupported browser features
  if (typeof WebSocket === 'undefined') {
    return (
      <div>
        <p>Browser compatibility</p>
        <p>Limited features</p>
        <button>Refresh page</button>
      </div>
    );
  }

  // Check for offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return (
      <RegistrationScreen event={event}>
        <div>
          <p>Offline mode</p>
          <p>Connection restored</p>
        </div>
      </RegistrationScreen>
    );
  }

  switch (userState.screen) {
    case 'REGISTRATION':
      return <RegistrationScreen event={event} />;
    case 'WAITING':
      return <WaitingScreen event={event} />;
    case 'LOTTERY_LIVE':
      return <LotteryScreen event={event} />;
    case 'WINNER_RESULT':
    case 'NOT_WINNER_RESULT':
      return <ResultScreen event={event} />;
    default:
      return <div>Unknown screen: {userState.screen}</div>;
  }
};