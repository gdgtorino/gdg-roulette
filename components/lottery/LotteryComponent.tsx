'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/Badge';
// import { LoadingSpinner } from '../ui/LoadingSpinner'; // Removed unused import
import { LotteryAnimation } from '../ui/LotteryAnimation';
import { Event, Participant, Winner } from '@/lib/types';

interface LotteryComponentProps {
  event: Event;
  participants?: Participant[];
  onWinnerSelected?: (winner: Winner) => void;
  onDrawComplete?: (winners: Winner[]) => void;
  autoStart?: boolean;
  maxWinners?: number;
  isAdmin?: boolean;
}

export function LotteryComponent({
  event,
  participants = [],
  onWinnerSelected,
  onDrawComplete,
  autoStart = false,
  maxWinners = 10,
  isAdmin = false,
}: LotteryComponentProps) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawComplete, setDrawComplete] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<string>('');
  const [drawStarted, setDrawStarted] = useState(autoStart);
  const [remainingParticipants, setRemainingParticipants] = useState(participants);

  useEffect(() => {
    setRemainingParticipants(participants);
  }, [participants]);

  useEffect(() => {
    if (autoStart && participants.length > 0) {
      startDraw();
    }
  }, [autoStart, participants, startDraw]);

  const startDraw = useCallback(() => {
    if (remainingParticipants.length === 0) return;

    setDrawStarted(true);
    performDraw();
  }, [remainingParticipants.length, performDraw]);

  const performDraw = useCallback(async () => {
    if (drawComplete || winners.length >= maxWinners || remainingParticipants.length === 0) {
      setDrawComplete(true);
      if (onDrawComplete) {
        onDrawComplete(winners);
      }
      return;
    }

    setIsDrawing(true);

    // Animation phase - cycle through names
    const animationDuration = 2000;
    const intervalTime = 100;
    const animationInterval = setInterval(() => {
      if (remainingParticipants.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingParticipants.length);
        setCurrentSelection(remainingParticipants[randomIndex].name);
      }
    }, intervalTime);

    // Stop animation and select winner
    setTimeout(() => {
      clearInterval(animationInterval);

      if (remainingParticipants.length > 0) {
        const selectedIndex = Math.floor(Math.random() * remainingParticipants.length);
        const selectedParticipant = remainingParticipants[selectedIndex];

        const newWinner: Winner = {
          id: `winner-${Date.now()}-${Math.random()}`,
          eventId: event.id,
          participantId: selectedParticipant.id,
          participantName: selectedParticipant.name,
          drawOrder: winners.length + 1,
          drawnAt: new Date(),
        };

        setCurrentSelection(selectedParticipant.name);
        setWinners((prev) => [...prev, newWinner]);

        // Remove selected participant from remaining pool
        setRemainingParticipants((prev) => prev.filter((p) => p.id !== selectedParticipant.id));

        if (onWinnerSelected) {
          onWinnerSelected(newWinner);
        }

        // Show winner briefly then continue if not complete
        setTimeout(() => {
          setIsDrawing(false);
          setCurrentSelection('');

          // Continue drawing if not complete
          if (winners.length + 1 < maxWinners && remainingParticipants.length > 1) {
            setTimeout(() => performDraw(), 1500);
          } else {
            setDrawComplete(true);
            if (onDrawComplete) {
              onDrawComplete([...winners, newWinner]);
            }
          }
        }, 2000);
      }
    }, animationDuration);
  }, [
    drawComplete,
    winners,
    maxWinners,
    remainingParticipants,
    onDrawComplete,
    onWinnerSelected,
    event.id,
  ]);

  const resetDraw = () => {
    setWinners([]);
    setIsDrawing(false);
    setDrawComplete(false);
    setCurrentSelection('');
    setDrawStarted(false);
    setRemainingParticipants(participants);
  };

  const getPositionDisplay = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  if (participants.length === 0) {
    return (
      <Card className="w-full max-w-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-600 mb-4">No Participants</h2>
        <p className="text-gray-500">No participants have registered for this event yet.</p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{event.name} - Lottery Draw</h1>
            <p className="text-gray-600">
              {participants.length} participants • {maxWinners} winners to be selected
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <Badge variant={drawComplete ? 'success' : isDrawing ? 'warning' : 'secondary'}>
              {drawComplete
                ? 'Complete'
                : isDrawing
                  ? 'Drawing...'
                  : drawStarted
                    ? 'In Progress'
                    : 'Ready'}
            </Badge>

            {isAdmin && !drawStarted && (
              <Button onClick={startDraw} size="lg">
                Start Draw
              </Button>
            )}

            {isAdmin && drawComplete && (
              <Button onClick={resetDraw} variant="outline">
                Reset Draw
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Drawing Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Animation Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-center mb-6 text-gray-800">
            {isDrawing ? 'Selecting Winner...' : drawComplete ? 'Draw Complete!' : 'Ready to Draw'}
          </h2>

          <div className="flex flex-col items-center space-y-6">
            {/* Animation Component */}
            <div className="w-full">
              <LotteryAnimation isActive={isDrawing} currentWinner={currentSelection} />
            </div>

            {/* Current Selection Display */}
            {(isDrawing || currentSelection) && (
              <div className="text-center p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white w-full">
                <div className="text-2xl font-bold mb-2">
                  {isDrawing ? '🎲 Selecting...' : '🎉 Selected!'}
                </div>
                <div className="text-xl font-semibold">{currentSelection || 'Drawing...'}</div>
                {!isDrawing && currentSelection && winners.length > 0 && (
                  <div className="text-sm opacity-90 mt-2">Winner #{winners.length}</div>
                )}
              </div>
            )}

            {/* Draw Progress */}
            {drawStarted && (
              <div className="w-full">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>
                    {winners.length} / {maxWinners}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((winners.length / maxWinners) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Winners List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Selected Winners</h2>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {winners.length} / {maxWinners}
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {winners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">No winners selected yet</p>
                <p className="text-sm">
                  {drawStarted ? 'Drawing in progress...' : 'Click "Start Draw" to begin'}
                </p>
              </div>
            ) : (
              winners.map((winner, index) => (
                <div
                  key={winner.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                    index === 0
                      ? 'border-yellow-400 bg-yellow-50'
                      : index === 1
                        ? 'border-gray-400 bg-gray-50'
                        : index === 2
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-blue-400 bg-blue-50'
                  } transition-all duration-300`}
                  style={{
                    animation: index === winners.length - 1 ? 'fadeInUp 0.5s ease-out' : undefined,
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getPositionDisplay(winner.drawOrder)}</div>
                    <div>
                      <p className="font-semibold text-gray-800">{winner.participantName}</p>
                      <p className="text-sm text-gray-500">
                        Position #{winner.drawOrder} • {winner.drawnAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Remaining Participants Count */}
          {drawStarted && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center text-sm text-gray-600">
                <p>
                  <strong>{remainingParticipants.length}</strong> participants remaining
                </p>
                <p className="text-xs mt-1">
                  {maxWinners - winners.length} more winners to be selected
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Statistics */}
      {drawComplete && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Draw Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{participants.length}</div>
              <p className="text-sm text-gray-600">Total Participants</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{winners.length}</div>
              <p className="text-sm text-gray-600">Winners Selected</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((winners.length / participants.length) * 100)}%
              </div>
              <p className="text-sm text-gray-600">Win Rate</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {participants.length - winners.length}
              </div>
              <p className="text-sm text-gray-600">Not Selected</p>
            </div>
          </div>
        </Card>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
