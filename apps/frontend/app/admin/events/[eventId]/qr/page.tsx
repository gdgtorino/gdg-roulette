"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";
import { useTranslation } from "@/hooks/useTranslation";
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Event {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  registrationOpen: boolean;
  qrCode: string;
}

interface Participant {
  id: string;
  eventId: string;
  name: string;
  registeredAt: string;
}

export default function EventQRPage(): JSX.Element {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");
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

  useEffect(() => {
    setRegistrationUrl(`${window.location.origin}/register/${eventId}`);
  }, [eventId]);

  const fetchEventData = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch event details
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
    } catch (error) {
      console.error("Failed to fetch event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegistration = async (): Promise<void> => {
    if (!event) return;

    setToggleLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events/${eventId}/registration`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json() as { registrationOpen: boolean };
        setEvent(prev => prev ? { ...prev, registrationOpen: data.registrationOpen } : null);
        
        // If registration was closed, redirect to draw page
        if (!data.registrationOpen) {
          window.location.href = `/admin/events/${eventId}/draw`;
        }
      } else {
        const error = await response.json() as { error: string };
        setModal({
          open: true,
          title: t('common.error'),
          message: error.error || t('admin.failedToToggle'),
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
    } finally {
      setToggleLoading(false);
    }
  };

  const copyLink = (): void => {
    void navigator.clipboard.writeText(registrationUrl);
    setModal({
      open: true,
      title: t('common.success'),
      message: t('admin.linkCopied'),
      type: 'success'
    });
  };

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onParticipantRegistered: (participant) => {
      console.log('New participant registered:', participant);
      // Add new participant to the list
      setParticipants(prev => [...prev, participant as Participant]);
    },
  });

  useEffect(() => {
    setMounted(true);
    void fetchEventData();
  }, [eventId]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('common.loading')}</div>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{t('admin.eventQRRegistration')}</p>
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

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code Card */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('admin.registrationQR')}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t('admin.scanToRegister')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {/* QR Code Image */}
              <div className="mb-6 flex justify-center">
                <img 
                  src={event.qrCode} 
                  alt="Registration QR Code"
                  className="max-w-xs w-full border rounded-lg shadow-sm"
                />
              </div>
              
              {/* Registration Link */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('admin.registrationLink')}:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded text-sm break-all">
                    {registrationUrl}
                  </code>
                  <Button size="sm" onClick={copyLink}>
                    {t('admin.copy')}
                  </Button>
                </div>
              </div>

              {/* Registration Status */}
              <div className="mb-6">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  event.registrationOpen 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  {t('admin.registration')} {event.registrationOpen ? t('admin.open') : t('admin.closed')}
                </div>
              </div>

              {/* Toggle Registration Button */}
              <Button
                onClick={toggleRegistration}
                disabled={toggleLoading}
                variant={event.registrationOpen ? "destructive" : "default"}
                size="lg"
              >
                {toggleLoading 
                  ? t('admin.processing')
                  : event.registrationOpen 
                    ? t('admin.closeRegistrationStart') 
                    : t('admin.reopenRegistration')
                }
              </Button>

              {!event.registrationOpen && (
                <div className="mt-4">
                  <Button
                    onClick={() => window.location.href = `/admin/events/${eventId}/draw`}
                    size="lg"
                  >
                    {t('admin.goToDrawPage')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants List */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('admin.registeredParticipants')}</CardTitle>
              <CardDescription className="dark:text-gray-300">
                {t('admin.participantsCount', { count: participants.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 border dark:border-gray-600 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium dark:text-white">#{index + 1} {participant.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(participant.registeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {t('admin.noParticipantsYet')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            {t('common.ok')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}