'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSocket } from "@/hooks/useSocket";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
  closed: boolean;
}

interface Participant {
  id: string;
  name: string;
  registeredAt: string;
}

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: string;
}

interface DrawMachineProps {
  eventId: string;
  event: Event;
  participants: Participant[];
  winners: Winner[];
  availableParticipants: Participant[];
}

export function DrawMachine({
  eventId,
  participants: initialParticipants,
  winners: initialWinners,
  availableParticipants: initialAvailable
}: DrawMachineProps) {
  const [participants] = useState(initialParticipants);
  const [winners, setWinners] = useState(initialWinners);
  const [availableParticipants, setAvailableParticipants] = useState(initialAvailable);
  const [drawing, setDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Update available participants when winners change
  useEffect(() => {
    const available = participants.filter(
      p => !winners.some(w => w.participantId === p.id)
    );
    setAvailableParticipants(available);
  }, [participants, winners]);

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onWinnerDrawn: (winner) => {
      console.log('New winner drawn:', winner);
      setWinners(prev => [...prev, winner as Winner]);
    },
  });

  const fireConfetti = async (): Promise<void> => {
    // Multiple confetti bursts
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

    // Center burst
    await confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Side bursts
    setTimeout(() => {
      void confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors
      });
    }, 200);

    setTimeout(() => {
      void confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors
      });
    }, 400);

    // Continuous small bursts
    let count = 0;
    const interval = setInterval(() => {
      void confetti({
        particleCount: 20,
        spread: 40,
        origin: {
          x: Math.random(),
          y: 0.8 + Math.random() * 0.2
        },
        colors
      });
      count++;
      if (count >= 5) {
        clearInterval(interval);
      }
    }, 300);
  };

  const drawWinner = async (): Promise<void> => {
    if (availableParticipants.length === 0) {
      setModal({
        open: true,
        title: 'No Participants',
        message: 'No participants available to draw from.',
        type: 'error'
      });
      return;
    }

    setDrawing(true);
    setRouletteSpinning(true);
    setShowWinner(false);
    setCurrentWinner(null);

    // Show roulette spinning for 3 seconds
    setTimeout(async () => {
      try {
        // Get token from localStorage for API call
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/events/${eventId}/draw`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const winner = await response.json() as Winner;
          setCurrentWinner(winner);
          setWinners(prev => [...prev, winner]);

          // Stop roulette and show winner
          setRouletteSpinning(false);
          setShowWinner(true);

          // Trigger confetti
          void fireConfetti();

        } else {
          const error = await response.json() as { error: string };
          setModal({
            open: true,
            title: 'Draw Failed',
            message: error.error || 'Failed to draw winner',
            type: 'error'
          });
          setRouletteSpinning(false);
        }
      } catch {
        // Network or other error occurred
        setModal({
          open: true,
          title: 'Error',
          message: 'Network error occurred while drawing',
          type: 'error'
        });
        setRouletteSpinning(false);
      } finally {
        setDrawing(false);
      }
    }, 3000);
  };

  const resetDraw = () => {
    setShowWinner(false);
    setCurrentWinner(null);
  };

  return (
    <>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-8">
          <div className="text-center">
            {/* Draw Machine Display */}
            <div className="relative mb-8">
              <div className="w-full max-w-md mx-auto h-64 bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800 rounded-lg border-4 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                {rouletteSpinning ? (
                  <div className="animate-spin text-6xl">🎰</div>
                ) : showWinner && currentWinner ? (
                  <div className="text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {currentWinner.participantName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Winner #{currentWinner.drawOrder}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">🎲</div>
                    <div>Ready to draw!</div>
                  </div>
                )}
              </div>
            </div>

            {/* Draw Controls */}
            <div className="space-y-4">
              {!showWinner ? (
                <Button
                  onClick={drawWinner}
                  disabled={drawing || availableParticipants.length === 0}
                  size="lg"
                  className="px-8 py-3 text-lg"
                >
                  {drawing ? (rouletteSpinning ? 'Drawing...' : 'Processing...') : 'Draw Winner!'}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="text-lg text-green-600 dark:text-green-400 font-semibold">
                    🎊 Winner Selected! 🎊
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={resetDraw}
                      variant="outline"
                    >
                      Draw Another
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {availableParticipants.length} participant(s) remaining
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal for notifications */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className={modal.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              {modal.title}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}