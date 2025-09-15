'use client';

import React, { useEffect, useState } from 'react';
import { RegistrationScreen } from './RegistrationScreen';
import { WaitingScreen } from './WaitingScreen';
import { LotteryScreen } from './LotteryScreen';
import { ResultScreen } from './ResultScreen';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Event, Participant, Winner } from '@/lib/types';

export interface UserState {
  status: 'UNREGISTERED' | 'REGISTERED' | 'WINNER' | 'NOT_WINNER' | 'ERROR' | 'EVENT_CLOSED' | 'SESSION_EXPIRED';
  screen: 'REGISTRATION' | 'WAITING' | 'LOTTERY_LIVE' | 'WINNER_RESULT' | 'NOT_WINNER_RESULT' | 'ERROR' | 'EVENT_CLOSED';
  event?: Event;
  participant?: Participant;
  winner?: Winner;
  session?: any;
  message?: string;
  error?: string;
  action?: string;
}

interface UserScreenProps {
  event: Event;
  userState: UserState;
  onStateChange?: (newState: UserState) => void;
}

interface ErrorScreenProps {
  error: string;
}

function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      role="main"
      aria-label="Error Screen"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4" role="heading">Error</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          role="button"
          aria-label="Refresh page"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

interface ClosedEventScreenProps {
  event: Event;
}

function ClosedEventScreen({ event }: ClosedEventScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-600 mb-4">Event Closed</h1>
        <p className="text-gray-600 mb-4">
          The event "{event.name}" has been closed and is no longer accepting participants.
        </p>
      </div>
    </div>
  );
}

export function UserScreen({ event, userState, onStateChange }: UserScreenProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [browserCompatible, setBrowserCompatible] = useState(true);

  useEffect(() => {
    // Check browser compatibility
    if (typeof WebSocket === 'undefined') {
      setBrowserCompatible(false);
    }
  }, []);

  useEffect(() => {
    // Handle state transitions smoothly
    if (onStateChange) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [userState.screen, onStateChange]);

  // Handle unsupported browsers
  if (!browserCompatible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">Browser Compatibility</h1>
          <p className="text-gray-600 mb-4">
            Your browser has limited features. Some functionality may not work properly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            role="button"
            aria-label="Refresh page"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Handle offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">Offline Mode</h1>
          <p className="text-gray-600 mb-4">
            You are currently offline. Please check your internet connection.
          </p>
          <p className="text-sm text-gray-500">
            The page will automatically refresh when your connection is restored.
          </p>
        </div>
      </div>
    );
  }

  if (isTransitioning) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  switch (userState.screen) {
    case 'REGISTRATION':
      return (
        <RegistrationScreen
          event={event}
          message={userState.message}
        />
      );

    case 'WAITING':
      return (
        <WaitingScreen
          event={event}
          participant={userState.participant!}
        />
      );

    case 'LOTTERY_LIVE':
      return (
        <LotteryScreen
          event={event}
          participant={userState.participant}
          isLive={true}
        />
      );

    case 'WINNER_RESULT':
      return (
        <ResultScreen
          event={event}
          isWinner={true}
          winner={userState.winner!}
          participant={userState.participant}
        />
      );

    case 'NOT_WINNER_RESULT':
      return (
        <ResultScreen
          event={event}
          isWinner={false}
          participant={userState.participant!}
        />
      );

    case 'ERROR':
      return <ErrorScreen error={userState.error || 'An unknown error occurred'} />;

    case 'EVENT_CLOSED':
      return <ClosedEventScreen event={event} />;

    default:
      return <ErrorScreen error="Invalid screen state" />;
  }
}