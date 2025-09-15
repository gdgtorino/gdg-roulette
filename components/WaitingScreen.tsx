'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Badge } from './ui/Badge';
import { Event, Participant } from '@/lib/types';

interface WaitingScreenProps {
  event: Event;
  participant: Participant;
  participantCount?: number;
  liveUpdates?: boolean;
  onCountUpdate?: (count: number) => void;
}

export function WaitingScreen({
  event,
  participant,
  participantCount = 0,
  liveUpdates = false,
  onCountUpdate
}: WaitingScreenProps) {
  const [currentCount, setCurrentCount] = useState(participantCount);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    setCurrentCount(participantCount);
  }, [participantCount]);

  useEffect(() => {
    if (liveUpdates) {
      // Simulate live updates connection
      const connectToUpdates = async () => {
        try {
          setIsConnected(true);
          setConnectionError(null);

          // Simulate periodic updates
          const interval = setInterval(() => {
            const newCount = Math.max(1, currentCount + Math.floor(Math.random() * 3) - 1);
            setCurrentCount(newCount);
            setLastUpdate(new Date());

            if (onCountUpdate) {
              onCountUpdate(newCount);
            }
          }, 5000);

          return () => clearInterval(interval);
        } catch (error) {
          setConnectionError('Failed to connect to live updates');
          setIsConnected(false);
        }
      };

      connectToUpdates();
    }
  }, [liveUpdates, currentCount, onCountUpdate]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center">
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome, {participant.name}
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              You're registered for <strong>{event.name}</strong>
            </p>

            {/* Registration Status Badge */}
            <Badge className="bg-green-100 text-green-800 px-4 py-2 text-sm">
              ✓ Registration Confirmed
            </Badge>
          </div>

          {/* Participant Count */}
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {currentCount}
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentCount === 1 ? 'Participant' : 'Participants'} Registered
                  </p>
                </div>

                {liveUpdates && (
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {isConnected ? (
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      )}
                      <span className="ml-2 text-sm text-gray-600">
                        {isConnected ? 'Live Updates' : 'Disconnected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Last update: {formatTime(lastUpdate)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connection Error */}
          {connectionError && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ {connectionError}
              </p>
            </div>
          )}

          {/* Waiting Message */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner className="mr-3" />
              <h2 className="text-xl font-semibold text-gray-700">
                Waiting for Draw to Begin
              </h2>
            </div>

            <p className="text-gray-600 mb-4">
              You will be notified automatically when the lottery draw starts.
              Please keep this page open to receive real-time updates.
            </p>

            <div className="text-sm text-gray-500 space-y-1">
              <p>• Registration confirmed at {participant.registeredAt.toLocaleString()}</p>
              <p>• Draw will begin when registration closes</p>
              <p>• Results will be announced immediately</p>
            </div>
          </div>

          {/* Event Information */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <strong>Event:</strong> {event.name}
              </div>
              <div>
                <strong>Your ID:</strong> {participant.id.slice(0, 8)}...
              </div>
              <div>
                <strong>Registration:</strong> {event.registrationOpen ? 'Open' : 'Closed'}
              </div>
              <div>
                <strong>Status:</strong> {event.closed ? 'Completed' : 'Active'}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Important:</strong> Keep this browser tab open to receive notifications
              when winners are announced. You'll be automatically redirected when the draw begins.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}