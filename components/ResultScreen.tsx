'use client';

import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Event, Participant, Winner } from '@/lib/types';

interface ResultScreenProps {
  event: Event;
  isWinner: boolean;
  winner?: Winner;
  participant?: Participant;
  eventStats?: {
    totalParticipants: number;
    totalWinners: number;
    yourOdds?: string;
    drawDuration?: string;
  };
  stats?: {
    totalParticipants: number;
    totalWinners: number;
    yourOdds: string;
    drawDuration: string;
  };
  showConfetti?: boolean;
  showTimestamp?: boolean;
  showStats?: boolean;
  showPosition?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  onShare?: (data: {
    type: 'WINNER' | 'PARTICIPANT';
    participantName: string;
    eventName: string;
    drawOrder?: number;
  }) => void;
  onNavigateBack?: (path: string) => void;
}

export function ResultScreen({
  event,
  isWinner,
  winner,
  participant,
  eventStats,
  stats,
  showConfetti = false,
  showTimestamp = false,
  showStats = false,
  showPosition = false,
  loading = false,
  loadingMessage,
  onShare,
  onNavigateBack
}: ResultScreenProps) {
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  // Trigger confetti effect for winners
  useEffect(() => {
    if (isWinner && showConfetti && !confettiTriggered) {
      setConfettiTriggered(true);

      // Mock confetti - in real implementation would use canvas-confetti library
      if (typeof window !== 'undefined' && (window as any).confetti) {
        (window as any).confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [isWinner, showConfetti, confettiTriggered]);

  const getPositionText = (drawOrder: number): string => {
    if (drawOrder === 1) return 'First Place';
    if (drawOrder === 2) return 'Second Place';
    if (drawOrder === 3) return 'Third Place';
    return `${drawOrder}th Place`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleShare = () => {
    if (onShare) {
      onShare({
        type: isWinner ? 'WINNER' : 'PARTICIPANT',
        participantName: isWinner ? (winner?.participantName || '') : (participant?.name || ''),
        eventName: event.name,
        drawOrder: winner?.drawOrder
      });
    }
  };

  const handleNavigateBack = () => {
    if (onNavigateBack) {
      onNavigateBack('/events');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <LoadingSpinner className="mb-4 mx-auto" />
            <p className="text-gray-600" role="progressbar">
              {loadingMessage || 'Loading results...'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="w-full max-w-2xl p-8">
        {/* Winner Result */}
        {isWinner && winner && (
          <div className="text-center">
            {/* Congratulations Header */}
            <div className="mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold text-green-600 mb-2">
                Congratulations!
              </h1>
              <p className="text-xl text-gray-700">
                You have been selected in {event.name}
              </p>
            </div>

            {/* Winner Details */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-2">{winner.participantName}</h2>

              {showPosition && (
                <div className="mb-4">
                  <Badge className="bg-white text-orange-600 text-lg px-4 py-2">
                    🏆 {getPositionText(winner.drawOrder)}
                  </Badge>
                </div>
              )}

              {!showPosition && (
                <p className="text-lg">
                  Position #{winner.drawOrder}
                </p>
              )}

              {showTimestamp && winner.drawnAt && (
                <div className="mt-4 text-sm opacity-90">
                  <p>Selected on {formatDate(winner.drawnAt)}</p>
                  <p>at {formatTime(winner.drawnAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Non-Winner Result */}
        {!isWinner && participant && (
          <div className="text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🎲</div>
              <h1 className="text-2xl font-bold text-gray-600 mb-2">
                Thank You for Participating
              </h1>
              <p className="text-lg text-gray-700 mb-4">
                {participant.name}
              </p>
              <p className="text-gray-600">
                Unfortunately, you were not selected in this draw, but thank you for participating in {event.name}.
              </p>
            </div>
          </div>
        )}

        {/* Event Statistics */}
        {showStats && (stats || eventStats) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
              Draw Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(stats || eventStats)?.totalParticipants}
                </div>
                <p className="text-sm text-gray-600">Total Participants</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {(stats || eventStats)?.totalWinners}
                </div>
                <p className="text-sm text-gray-600">Winners Selected</p>
              </div>
              {(stats?.yourOdds || eventStats?.yourOdds) && (
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats?.yourOdds || eventStats?.yourOdds}
                  </div>
                  <p className="text-sm text-gray-600">Your Odds</p>
                </div>
              )}
              {(stats?.drawDuration || eventStats?.drawDuration) && (
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats?.drawDuration || eventStats?.drawDuration}
                  </div>
                  <p className="text-sm text-gray-600">Draw Duration</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Information */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p><strong>Event:</strong> {event.name}</p>
            <p><strong>Draw completed:</strong> {new Date().toLocaleString()}</p>
            {participant && (
              <p><strong>Your registration:</strong> {participant.registeredAt.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onShare && (
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Share Result
            </Button>
          )}

          {onNavigateBack && (
            <Button
              onClick={handleNavigateBack}
              className="w-full sm:w-auto"
            >
              Back to Events
            </Button>
          )}
        </div>

        {/* Additional Information */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            This result is final. If you believe there was an error, please contact the event organizer.
          </p>
        </div>
      </Card>
    </div>
  );
}