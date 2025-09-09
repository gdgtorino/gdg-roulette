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
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/hooks/useTranslation";
import { useSocket } from "@/hooks/useSocket";

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

export default function DrawPage(): JSX.Element {
  const { t } = useTranslation();
  const params = useParams();
  const eventId = params.eventId as string;
  const [mounted, setMounted] = useState(false);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [modal, setModal] = useState<{open: boolean; title: string; message: string; type: 'success' | 'error';}>({ open: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      setModal({ open: true, title: t('draw.noParticipants'), message: t('draw.noParticipantsMessage'), type: 'error' });
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
          setModal({ open: true, title: t('draw.drawFailed'), message: error.error || t('draw.failedToDrawWinner'), type: 'error' });
          setRouletteSpinning(false);
        }
      } catch (error) {
        setModal({ open: true, title: t('common.error'), message: t('common.networkError'), type: 'error' });
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

  const closeEvent = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events/${eventId}/close`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setModal({
          open: true,
          title: t('draw.drawClosed'),
          message: t('draw.drawClosedMessage'),
          type: 'success'
        });
        await fetchEventData();
      } else {
        const error = await response.json() as { error: string };
        setModal({
          open: true,
          title: t('common.error'),
          message: error.error || t('draw.closeError'),
          type: 'error'
        });
      }
    } catch (error) {
      setModal({
        open: true,
        title: t('common.error'),
        message: t('common.networkError'),
        type: 'error'
      });
    }
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('common.loading')}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('common.loading')}</div>
      </div>
    );
  }

  if (event.registrationOpen) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-yellow-600 dark:text-yellow-400">{t('draw.registrationStillOpen')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
              {t('draw.closeRegistrationFirst')}
            </p>
            <Button 
              onClick={() => window.location.href = `/admin/events/${eventId}/qr`}
              className="w-full"
            >
              {t('draw.goBackToQR')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('draw.title')}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <DarkModeToggle />
              {event && !event.closed && winners.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={closeEvent}
                >
                  {t('draw.closeDraw')}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin/dashboard'}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('draw.backToDashboard')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Roulette & Draw Section */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">🎰 {t('draw.drawWinner')}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('draw.participantsAvailable').replace('{count}', availableParticipants.length.toString())}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Roulette Visual */}
              <div className="mb-6 flex justify-center">
                <div className={`w-64 h-64 border-8 border-blue-500 dark:border-blue-400 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 ${
                  rouletteSpinning ? 'animate-spin' : ''
                }`} style={{
                  animationDuration: rouletteSpinning ? '0.1s' : undefined
                }}>
                  {showWinner && currentWinner ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎉</div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        {currentWinner.participantName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {t('draw.winnerNumber').replace('{number}', currentWinner.drawOrder.toString())}
                      </div>
                    </div>
                  ) : rouletteSpinning ? (
                    <div className="text-center">
                      <div className="text-4xl animate-bounce">🎯</div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{t('draw.drawing')}</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl">🎲</div>
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">{t('draw.readyToDraw')}</div>
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
                  {drawing ? t('draw.drawing') : `🎰 ${t('draw.drawNextWinner')}`}
                </Button>

                {currentWinner && showWinner && (
                  <div>
                    <Button
                      variant="outline"
                      onClick={resetCurrentWinner}
                      size="sm"
                      className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('draw.clearWinnerDisplay')}
                    </Button>
                  </div>
                )}

                {availableParticipants.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t('draw.allParticipantsDrawn')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Winners List */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">🏆 {t('draw.winners')}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('draw.winnersDrawnSoFar').replace('{count}', winners.length.toString())}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  >
                    <div>
                      <div className="font-bold text-lg text-yellow-800 dark:text-yellow-200">
                        #{winner.drawOrder} {winner.participantName}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-400">
                        {t('draw.drawn')}: {new Date(winner.drawnAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-2xl">
                      {winner.drawOrder === 1 ? '🥇' : winner.drawOrder === 2 ? '🥈' : winner.drawOrder === 3 ? '🥉' : '🏆'}
                    </div>
                  </div>
                ))}
                {winners.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('draw.noWinnersYet')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remaining Participants */}
        {availableParticipants.length > 0 && (
          <Card className="mt-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">📋 {t('draw.remainingParticipants')}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('draw.participantsNotDrawnYet')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-center"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{participant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">#{index + 1}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Error Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{modal.title}</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>
              {t('common.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}