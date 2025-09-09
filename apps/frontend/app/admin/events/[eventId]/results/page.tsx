"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Event {
  id: string;
  name: string;
  createdAt: string;
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

export default function ResultsPage(): JSX.Element {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch winners
      const winnersResponse = await fetch(`/api/events/${eventId}/winners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (winnersResponse.ok) {
        const winnersData = await winnersResponse.json() as Winner[];
        setWinners(winnersData);
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void fetchEventData();
  }, [eventId]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('admin.loadingResults')}</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('common.eventNotFound')}</div>
      </div>
    );
  }

  const nonWinners = participants.filter(
    p => !winners.some(w => w.participantId === p.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('admin.eventResults')} - {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <DarkModeToggle />
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin/dashboard'}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('admin.backToDashboard')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.totalParticipants')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {participants.length}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.winnersDrawn')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {winners.length}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('admin.winRate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {participants.length > 0 
                  ? Math.round((winners.length / participants.length) * 100) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Winners */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">🏆 {t('admin.winners')}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t('admin.winnersInOrder').replace('{count}', winners.length.toString())}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700"
                  >
                    <div>
                      <div className="font-bold text-lg text-yellow-800 dark:text-yellow-200">
                        #{winner.drawOrder} {winner.participantName}
                      </div>
                      <div className="text-sm text-yellow-600 dark:text-yellow-300">
                        {t('admin.drawn')}: {new Date(winner.drawnAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-3xl">
                      {winner.drawOrder === 1 ? '🥇' : 
                       winner.drawOrder === 2 ? '🥈' : 
                       winner.drawOrder === 3 ? '🥉' : '🏆'}
                    </div>
                  </div>
                ))}
                {winners.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('admin.noWinners')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* All Participants */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">👥 {t('admin.allParticipants')}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t('admin.participantsByOrder')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participants.map((participant, index) => {
                  const isWinner = winners.some(w => w.participantId === participant.id);
                  const winner = winners.find(w => w.participantId === participant.id);
                  
                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        isWinner 
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' 
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${isWinner ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-900 dark:text-gray-100'}`}>
                          #{index + 1} {participant.name}
                        </div>
                        <div className={`text-sm ${isWinner ? 'text-yellow-600 dark:text-yellow-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {t('admin.registered')}: {new Date(participant.registeredAt).toLocaleString()}
                        </div>
                        {isWinner && winner && (
                          <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                            ✨ {t('admin.winnerPosition').replace('{position}', winner.drawOrder.toString())}
                          </div>
                        )}
                      </div>
                      <div className="text-lg">
                        {isWinner ? '🎉' : '👤'}
                      </div>
                    </div>
                  );
                })}
                {participants.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('admin.noParticipants')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Non-winners (if there are winners) */}
        {winners.length > 0 && nonWinners.length > 0 && (
          <Card className="mt-6 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">📋 {t('admin.nonWinners')}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t('admin.participantsNotDrawn').replace('{count}', nonWinners.length.toString())}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {nonWinners.map((participant) => (
                  <div
                    key={participant.id}
                    className="p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-center"
                  >
                    <div className="font-medium text-gray-700 dark:text-gray-200">{participant.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(participant.registeredAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}