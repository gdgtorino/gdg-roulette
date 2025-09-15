'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/Badge';
import { LotteryAnimation } from './ui/LotteryAnimation';
import { Event, Participant, Winner } from '@/lib/types';

interface LotteryScreenProps {
  event: Event;
  participant?: Participant;
  isLive?: boolean;
  currentWinners?: Winner[];
  showAnimation?: boolean;
  onWinnerUpdate?: (winner: Winner) => void;
  onDrawComplete?: (winners: Winner[]) => void;
}

export function LotteryScreen({
  event,
  participant,
  isLive = false,
  currentWinners = [],
  showAnimation = true,
  onWinnerUpdate,
  onDrawComplete
}: LotteryScreenProps) {
  const [winners, setWinners] = useState<Winner[]>(currentWinners);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDraw, setCurrentDraw] = useState<Winner | null>(null);
  const [drawComplete, setDrawComplete] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    setWinners(currentWinners);
  }, [currentWinners]);

  useEffect(() => {
    if (isLive) {
      // Simulate live connection
      setConnectionStatus('connected');

      // Simulate drawing process
      const drawInterval = setInterval(() => {
        if (!drawComplete && Math.random() > 0.7) {
          setIsDrawing(true);

          // Simulate winner selection after animation
          setTimeout(() => {
            const newWinner: Winner = {
              id: `winner-${Date.now()}`,
              eventId: event.id,
              participantId: `participant-${Math.floor(Math.random() * 1000)}`,
              participantName: `Winner ${winners.length + 1}`,
              drawOrder: winners.length + 1,
              drawnAt: new Date()
            };

            setCurrentDraw(newWinner);
            setWinners(prev => [...prev, newWinner]);
            setIsDrawing(false);

            if (onWinnerUpdate) {
              onWinnerUpdate(newWinner);
            }

            // Clear current draw after showing
            setTimeout(() => {
              setCurrentDraw(null);
            }, 3000);

            // Complete draw after 5 winners
            if (winners.length >= 4) {
              setDrawComplete(true);
              if (onDrawComplete) {
                onDrawComplete([...winners, newWinner]);
              }
            }
          }, 2000);
        }
      }, 3000);

      return () => clearInterval(drawInterval);
    }
  }, [isLive, winners.length, drawComplete, event.id, onWinnerUpdate, onDrawComplete, winners]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-400';
      case 'connecting': return 'bg-yellow-400';
      case 'disconnected': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-purple-50 to-blue-50">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <h1 className="text-4xl font-bold text-gray-800">
              Live Draw - {event.name}
            </h1>
            {isLive && (
              <Badge className={`${getConnectionStatusColor()} text-white px-3 py-1`}>
                <div className={`w-2 h-2 rounded-full bg-white mr-2 ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
                {getConnectionStatusText()}
              </Badge>
            )}
          </div>

          {participant && (
            <p className="text-lg text-gray-600">
              Good luck, <strong>{participant.name}</strong>!
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Animation Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">
              {isDrawing ? 'Drawing Winner...' : drawComplete ? 'Draw Complete!' : 'Waiting for Next Draw'}
            </h2>

            <div className="flex flex-col items-center space-y-6">
              {showAnimation && (
                <div data-testid="lottery-animation" className="w-full">
                  <LotteryAnimation
                    isActive={isDrawing}
                    currentWinner={currentDraw?.participantName}
                  />
                </div>
              )}

              {currentDraw && (
                <div className="text-center p-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg text-white">
                  <h3 className="text-2xl font-bold mb-2">🎉 Winner Selected! 🎉</h3>
                  <p className="text-xl font-semibold">{currentDraw.participantName}</p>
                  <p className="text-sm opacity-90">Position #{currentDraw.drawOrder}</p>
                </div>
              )}

              {drawComplete && (
                <div className="text-center p-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg text-white">
                  <h3 className="text-2xl font-bold mb-2">🏆 Draw Complete! 🏆</h3>
                  <p className="text-lg">All winners have been selected</p>
                </div>
              )}
            </div>
          </Card>

          {/* Winners List */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Current Winners</h2>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {winners.length} Selected
              </Badge>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {winners.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">No winners selected yet</p>
                  <p className="text-sm">Draw will begin shortly...</p>
                </div>
              ) : (
                winners.map((winner, index) => (
                  <div
                    key={winner.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      index === 0 ? 'border-yellow-400 bg-yellow-50' :
                      index === 1 ? 'border-gray-400 bg-gray-50' :
                      index === 2 ? 'border-orange-400 bg-orange-50' :
                      'border-blue-400 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}>
                        {winner.drawOrder}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {index + 1}. {winner.participantName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {winner.drawnAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {index < 3 && (
                      <div className="text-right">
                        <Badge className={
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-500' :
                          'bg-orange-500'
                        }>
                          {index === 0 ? '🥇 1st' :
                           index === 1 ? '🥈 2nd' :
                           '🥉 3rd'}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Draw Progress */}
            {isLive && !drawComplete && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Draw Progress</span>
                  <span>{winners.length} / 10 winners</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(winners.length / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Footer Information */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600 bg-white rounded-lg px-6 py-3 shadow-sm">
            <div>Event: {event.name}</div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div>Status: {drawComplete ? 'Complete' : isLive ? 'Live' : 'Waiting'}</div>
            {participant && (
              <>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div>Participant: {participant.name}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}