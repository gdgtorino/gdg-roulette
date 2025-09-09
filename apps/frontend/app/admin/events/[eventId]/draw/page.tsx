"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
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

export default function DrawPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [modal, setModal] = useState<{open: boolean; title: string; message: string; type: 'success' | 'error';}>({ open: false, title: '', message: '', type: 'success' });

  const fetchEventData = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch event
      const eventResponse = await fetch(`/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (eventResponse.ok) {
        const eventData = await eventResponse.json() as Event;
        setEvent(eventData);
      }

      // Fetch participants
      const participantsResponse = await fetch(`/api/events/${eventId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json() as Participant[];
        setParticipants(participantsData);
      }

      // Fetch existing winners
      const winnersResponse = await fetch(`/api/events/${eventId}/winners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (winnersResponse.ok) {
        const winnersData = await winnersResponse.json() as Winner[];
        setWinners(winnersData);
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error);
    }
  };

  const updateAvailableParticipants = (): void => {
    const available = participants.filter(
      p => !winners.some(w => w.participantId === p.id)
    );
    setAvailableParticipants(available);
  };

  const drawWinner = async (): Promise<void> => {
    if (availableParticipants.length === 0) {
      setModal({ open: true, title: 'No Participants', message: 'No participants available to draw!', type: 'error' });
      return;
    }

    setDrawing(true);
    setRouletteSpinning(true);
    setShowWinner(false);
    setCurrentWinner(null);

    // Show roulette spinning for 3 seconds
    setTimeout(async () => {
      try {
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
          setModal({ open: true, title: 'Draw Failed', message: error.error || 'Failed to draw winner', type: 'error' });
          setRouletteSpinning(false);
        }
      } catch (error) {
        setModal({ open: true, title: 'Error', message: 'Network error', type: 'error' });
        setRouletteSpinning(false);
      } finally {
        setDrawing(false);
      }
    }, 3000);
  };

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

  const resetCurrentWinner = (): void => {
    setCurrentWinner(null);
    setShowWinner(false);
  };

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onWinnerDrawn: (winner) => {
      // This handles real-time winner updates from other admin sessions
      const newWinner = winner as Winner;
      setWinners(prev => {
        // Avoid duplicates
        if (prev.some(w => w.id === newWinner.id)) {
          return prev;
        }
        return [...prev, newWinner].sort((a, b) => a.drawOrder - b.drawOrder);
      });
    },
  });

  useEffect(() => {
    void fetchEventData();
  }, [eventId]);

  useEffect(() => {
    updateAvailableParticipants();
  }, [participants, winners]);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (event.registrationOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-yellow-600">Registration Still Open</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              Please close registration before starting the draw.
            </p>
            <Button 
              onClick={() => window.location.href = `/admin/events/${eventId}/qr`}
              className="w-full"
            >
              Go Back to QR Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-600">Lottery Draw</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Roulette & Draw Section */}
          <Card>
            <CardHeader>
              <CardTitle>🎰 Draw Winner</CardTitle>
              <CardDescription>
                {availableParticipants.length} participants available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Roulette Visual */}
              <div className="mb-6 flex justify-center">
                <div className={`w-64 h-64 border-8 border-blue-500 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 ${
                  rouletteSpinning ? 'animate-spin' : ''
                }`} style={{
                  animationDuration: rouletteSpinning ? '0.1s' : undefined
                }}>
                  {showWinner && currentWinner ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎉</div>
                      <div className="font-bold text-lg text-gray-900">
                        {currentWinner.participantName}
                      </div>
                      <div className="text-sm text-gray-600">
                        Winner #{currentWinner.drawOrder}
                      </div>
                    </div>
                  ) : rouletteSpinning ? (
                    <div className="text-center">
                      <div className="text-4xl animate-bounce">🎯</div>
                      <div className="font-bold text-lg">Drawing...</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl">🎲</div>
                      <div className="font-bold text-lg">Ready to Draw</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Draw Button */}
              <div className="text-center">
                <Button
                  onClick={() => void drawWinner()}
                  disabled={drawing || availableParticipants.length === 0}
                  size="lg"
                  className="mb-4"
                >
                  {drawing ? "Drawing..." : "🎰 Draw Next Winner"}
                </Button>

                {currentWinner && showWinner && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={resetCurrentWinner}
                      size="sm"
                    >
                      Clear Winner Display
                    </Button>
                  </div>
                )}

                {availableParticipants.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    All participants have been drawn!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Winners List */}
          <Card>
            <CardHeader>
              <CardTitle>🏆 Winners</CardTitle>
              <CardDescription>
                {winners.length} winners drawn so far
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                  >
                    <div>
                      <div className="font-bold text-lg text-yellow-800">
                        #{winner.drawOrder} {winner.participantName}
                      </div>
                      <div className="text-sm text-yellow-600">
                        Drawn: {new Date(winner.drawnAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-2xl">
                      {winner.drawOrder === 1 ? '🥇' : winner.drawOrder === 2 ? '🥈' : winner.drawOrder === 3 ? '🥉' : '🏆'}
                    </div>
                  </div>
                ))}
                {winners.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No winners yet. Start drawing!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remaining Participants */}
        {availableParticipants.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>📋 Remaining Participants</CardTitle>
              <CardDescription>
                Participants who haven't been drawn yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="p-3 border rounded-lg bg-gray-50 text-center"
                  >
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-xs text-gray-500">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Error Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription>
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}