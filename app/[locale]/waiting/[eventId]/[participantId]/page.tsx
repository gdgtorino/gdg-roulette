'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSocket } from '@/hooks/useSocket';
import { useTranslation } from '@/hooks/useTranslation';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
  closed: boolean;
}

interface Participant {
  id: string;
  name: string;
}

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: string;
}

export default function WaitingPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId as string;
  const participantId = params.participantId as string;
  const { t } = useTranslation();

  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState<Winner | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [eventClosed, setEventClosed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = (await eventResponse.json()) as Event;
        setEvent(eventData);
        setRegistrationOpen(eventData.registrationOpen);
        setEventClosed(eventData.closed);
      }

      // Fetch participant details (public endpoint)
      const participantResponse = await fetch(
        `/api/events/${eventId}/participants/${participantId}`,
      );
      if (participantResponse.ok) {
        const participantData = (await participantResponse.json()) as Participant;
        setParticipant(participantData);
      }

      // Check if already winner (public endpoint)
      const winnerResponse = await fetch(
        `/api/events/${eventId}/participants/${participantId}/winner`,
      );
      if (winnerResponse.ok) {
        const winnerData = await winnerResponse.json();
        if (winnerData.id) {
          // If has winner ID, is a winner
          setIsWinner(true);
          setWinnerDetails(winnerData as Winner);
          await fireConfetti();
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, participantId]);

  const fireConfetti = async (): Promise<void> => {
    // Massive confetti celebration for winner!
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];

    // Big center burst
    await confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 },
    });

    // Multiple side bursts
    setTimeout(() => {
      void confetti({
        particleCount: 100,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors,
      });
    }, 300);

    setTimeout(() => {
      void confetti({
        particleCount: 100,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors,
      });
    }, 600);

    // Continuous celebration
    let count = 0;
    const interval = setInterval(() => {
      void confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: Math.random(),
          y: 0.7 + Math.random() * 0.3,
        },
        colors,
      });
      count++;
      if (count >= 8) {
        clearInterval(interval);
      }
    }, 400);
  };

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onWinnerDrawn: (winner) => {
      const newWinner = winner as Winner;
      console.log('Winner drawn:', newWinner);

      // Check if this participant won!
      if (newWinner.participantId === participantId) {
        console.log('I WON!');
        setIsWinner(true);
        setWinnerDetails(newWinner);
        void fireConfetti();
      }
    },
    onRegistrationToggled: (data) => {
      console.log('Registration toggled:', data);
      setRegistrationOpen(data.registrationOpen);
    },
    onEventClosed: (data) => {
      console.log('Event closed:', data);
      setEventClosed(data.closed);
    },
  });

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-900 dark:text-gray-100">{t('common.loading')}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600 dark:text-red-400">
              {t('registration.notFound')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-300">
              {t('registration.notFoundMessage')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventClosed && !isWinner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <Card className="w-full max-w-md border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800">
          <CardHeader className="text-center bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-700 dark:to-gray-800 text-white rounded-t-lg">
            <CardTitle className="text-3xl font-bold">{t('loser.sorry')}</CardTitle>
            <CardDescription className="text-gray-100 text-lg">
              {t('loser.extractionEnded')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {participant?.name || 'Partecipante'}
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                <strong>{t('loser.didntWin')}</strong>
              </p>
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">{event.name}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                {t('loser.sorryMessage')}
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                {t('loser.thanksForParticipating')}
              </p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">{t('loser.tryAgain')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isWinner && winnerDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gold-100 dark:from-yellow-900 dark:to-yellow-800 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <Card className="w-full max-w-md border-4 border-yellow-400 dark:border-yellow-500 shadow-2xl dark:bg-gray-800">
          <CardHeader className="text-center bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700 text-white rounded-t-lg">
            <CardTitle className="text-4xl font-bold">🎉 {t('winner.youWon')} 🎉</CardTitle>
            <CardDescription className="text-yellow-100 dark:text-yellow-200 text-lg">
              {t('winner.congratulations')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">
                {winnerDetails.drawOrder === 1
                  ? '🥇'
                  : winnerDetails.drawOrder === 2
                    ? '🥈'
                    : winnerDetails.drawOrder === 3
                      ? '🥉'
                      : '🏆'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {participant?.name || winnerDetails.participantName}
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                <strong>
                  {t('winner.position')} #{winnerDetails.drawOrder}
                </strong>
              </p>
              <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                {event.name}
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                🎊 {t('winner.lotteryWon')} 🎊
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {t('winner.contactOrganizer')}
              </p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('winner.drawnAt')}: {new Date(winnerDetails.drawnAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {registrationOpen ? t('waiting.registrationConfirmed') : t('waiting.waitingForDraw')}
          </CardTitle>
          <CardDescription className="text-lg dark:text-gray-300">{event.name}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <div className="text-4xl mb-4">{registrationOpen ? '✅' : '⏳'}</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {participant?.name || t('waiting.participant')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">{t('waiting.registered')}</p>
          </div>

          {registrationOpen ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✨ {t('waiting.registrationOpen')}</strong>
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {t('waiting.moreCanJoin')}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>🎲 {t('waiting.drawInProgress')}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {t('waiting.stayOnPage')}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${registrationOpen ? 'bg-green-500' : 'bg-blue-500'}`}
            ></div>
            <span>{t('waiting.liveUpdates')}</span>
          </div>

          <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
            <p>🍀 {t('waiting.goodLuck')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
