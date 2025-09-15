'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
  closed: boolean;
}
import { LotteryAnimation } from '@/components/ui/LotteryAnimation';

interface Winner {
  id: string;
  participant: {
    name: string;
    email: string;
  };
}

interface DrawInterfaceProps {
  event: Event;
}

export function DrawInterface({ event }: DrawInterfaceProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [winnerCount, setWinnerCount] = useState(1);
  const { toast } = useToast();

  const handleExecuteDraw = async () => {
    setIsDrawing(true);

    try {
      const response = await fetch(`/api/draws/${event.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerCount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Draw execution failed');
      }

      setWinners(result.winners);

      toast({
        title: 'Draw Completed!',
        description: `${result.winners.length} winner(s) selected.`,
      });
    } catch (error) {
      console.error('Draw execution error:', error);
      toast({
        title: 'Draw Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsDrawing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {event.name} - Live Draw
        </h2>

        {!isDrawing && winners.length === 0 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="winnerCount" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Winners
              </label>
              <input
                id="winnerCount"
                type="number"
                min={1}
                max={10}
                value={winnerCount}
                onChange={(e) => setWinnerCount(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
              />
            </div>

            <Button
              onClick={handleExecuteDraw}
              size="lg"
              className="px-8 py-4 text-lg"
            >
              Start Draw
            </Button>
          </div>
        )}

        {isDrawing && (
          <div className="space-y-6">
            <LotteryAnimation />
            <p className="text-lg text-gray-600">
              Drawing {winnerCount} winner{winnerCount > 1 ? 's' : ''}...
            </p>
          </div>
        )}

        {winners.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-green-600">
              🎉 Congratulations! 🎉
            </h3>

            <div className="grid gap-4">
              {winners.map((winner, index) => (
                <div
                  key={winner.id}
                  className="p-6 bg-gradient-to-r from-gold-100 to-yellow-100 rounded-lg border border-gold-300"
                >
                  <div className="text-xl font-bold text-gray-900">
                    🏆 Winner #{index + 1}
                  </div>
                  <div className="text-lg text-gray-800 mt-2">
                    {winner.participant.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {winner.participant.email}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => window.location.href = `/events/${event.id}/results`}
              size="lg"
              className="px-8"
            >
              View Full Results
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}