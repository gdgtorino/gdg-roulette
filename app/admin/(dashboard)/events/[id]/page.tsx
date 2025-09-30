'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EventStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { Modal } from '@/components/modal';

interface Participant {
  id: string;
  name: string;
  registeredAt: string;
  isWinner: boolean;
}

interface Winner {
  id: string;
  drawOrder: number;
  participant: {
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  participants: Participant[];
  winners: Winner[];
  _count: {
    participants: number;
    winners: number;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawnWinner, setDrawnWinner] = useState<string | null>(null);
  const [showWinnerAnimation, setShowWinnerAnimation] = useState(false);
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'success' | 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const registrationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004'}/events/${params.id}/register`;

  useEffect(() => {
    fetchEvent();
    // Polling ogni 3 secondi per aggiornare la lista partecipanti live
    const interval = setInterval(fetchEvent, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}`);
      const data = await res.json();
      setEvent(data);
    } catch {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load event',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update status',
        });
        return;
      }

      fetchEvent();
    } catch {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update status',
      });
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const handleDrawWinner = async () => {
    setDrawing(true);
    setShowWinnerAnimation(true);

    // Simula un drumroll di 1 secondo
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const res = await fetch(`/api/admin/events/${params.id}/draw`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        setModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to draw winner',
        });
        setShowWinnerAnimation(false);
        return;
      }

      const winner = await res.json();
      setDrawnWinner(winner.participant.name);
      triggerConfetti();

      // Aspetta che l'animazione finisca prima di aggiornare
      await new Promise(resolve => setTimeout(resolve, 2000));

      fetchEvent();
      setShowWinnerAnimation(false);
      setDrawnWinner(null);
    } catch {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to draw winner',
      });
      setShowWinnerAnimation(false);
    } finally {
      setDrawing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationUrl);
    setModal({
      isOpen: true,
      type: 'success',
      title: 'Copied!',
      message: 'Registration link copied to clipboard',
    });
  };

  const handleRemoveParticipant = async (participantId: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Remove Participant',
      message: 'Are you sure you want to remove this participant?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/events/${params.id}/participants/${participantId}`, {
            method: 'DELETE',
          });

          if (!res.ok) {
            setModal({
              isOpen: true,
              type: 'error',
              title: 'Error',
              message: 'Failed to remove participant',
            });
            return;
          }

          fetchEvent();
          setModal({
            isOpen: true,
            type: 'success',
            title: 'Success',
            message: 'Participant removed successfully',
          });
        } catch {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to remove participant',
          });
        }
      },
    });
  };

  const getStatusColor = (status: EventStatus) => {
    const colors = {
      INIT: 'from-gray-500 to-gray-600',
      REGISTRATION_OPEN: 'from-green-500 to-emerald-600',
      REGISTRATION_CLOSED: 'from-amber-500 to-orange-600',
      DRAWING: 'from-blue-500 to-purple-600',
      CLOSED: 'from-red-500 to-pink-600',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-600 dark:text-gray-400">Event not found</p>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.type === 'confirm' ? 'Confirm' : 'OK'}
        cancelText="Cancel"
      >
        {modal.message}
      </Modal>

      <div className="space-y-6">
        {/* WINNER DRAW ANIMATION */}
        {showWinnerAnimation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200">
          <div className="text-center max-w-4xl w-full px-8">
            {!drawnWinner ? (
              <>
                {/* Spinning Slot Machine Effect */}
                <div className="relative mb-12">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-8 border-blue-500/20 rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center animate-spin">
                    <div className="w-64 h-64 border-t-8 border-r-8 border-blue-500 rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}>
                    <div className="w-48 h-48 border-t-8 border-l-8 border-purple-500 rounded-full"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '1.5s' }}>
                    <div className="w-32 h-32 border-t-8 border-b-8 border-pink-500 rounded-full"></div>
                  </div>
                </div>

                <div className="text-5xl font-bold text-white mb-6 mt-64">
                  Drawing Winner
                </div>
                <div className="flex gap-2 justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </>
            ) : (
              <div className="animate-in zoom-in duration-700">
                {/* Winner Reveal */}
                <div className="mb-8">
                  <div className="inline-block p-8 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-pulse mb-8">
                    <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-white/60 mb-4 tracking-widest uppercase">
                    Winner Selected
                  </div>
                </div>

                <div className="backdrop-blur-xl bg-white/10 rounded-3xl border-4 border-white/20 p-12 shadow-2xl">
                  <div className="text-7xl font-bold text-white mb-2">
                    {drawnWinner}
                  </div>
                  <div className="h-2 w-32 mx-auto bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-lg text-gray-600 dark:text-gray-400">{event.description}</p>
            )}
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r ${getStatusColor(event.status)} whitespace-nowrap`}>
            {event.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Participants</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{event._count.participants}</p>
          </div>
          <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Winners Drawn</p>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{event._count.winners}</p>
          </div>
        </div>
      </div>

      {/* Event Controls */}
      <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Event Controls</h2>
        <div className="flex gap-3 flex-wrap">
          {event.status === EventStatus.INIT && (
            <button
              onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Open Registration
            </button>
          )}
          {event.status === EventStatus.REGISTRATION_OPEN && (
            <button
              onClick={() => handleStatusChange(EventStatus.REGISTRATION_CLOSED)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Close Registration
            </button>
          )}
          {event.status === EventStatus.REGISTRATION_CLOSED && (
            <>
              <button
                onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                Reopen Registration
              </button>
              <button
                onClick={() => handleStatusChange(EventStatus.DRAWING)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Drawing
              </button>
            </>
          )}
          {event.status === EventStatus.DRAWING && (
            <button
              onClick={() => handleStatusChange(EventStatus.CLOSED)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Close Event
            </button>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {event.status === EventStatus.REGISTRATION_OPEN && (
        <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Registration
          </h2>
          <div className="flex gap-8 items-center flex-wrap">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG value={registrationUrl} size={180} />
            </div>
            <div className="flex-1 min-w-[300px] space-y-4">
              <p className="text-gray-600 dark:text-gray-400">Scan QR code or share link:</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={registrationUrl}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-gray-300/50 dark:border-gray-600/50 text-gray-900 dark:text-white text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <button
                onClick={() => setShowQR(true)}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Interface */}
      {event.status === EventStatus.DRAWING && (
        <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Drawing
          </h2>
          <button
            onClick={handleDrawWinner}
            disabled={drawing || event._count.participants === event._count.winners}
            className="w-full py-6 px-8 rounded-2xl bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white text-2xl font-bold shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {drawing ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Drawing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                DRAW NEXT WINNER
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
            )}
          </button>
          {event._count.participants === event._count.winners && (
            <p className="text-center mt-4 text-lg text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              All participants have been drawn!
            </p>
          )}
        </div>
      )}

      {/* Winners List */}
      {event.winners.length > 0 && (
        <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Winners
          </h2>
          <div className="space-y-3">
            {event.winners.map((winner, index) => (
              <div
                key={winner.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                  #{winner.drawOrder}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{winner.participant.name}</p>
                </div>
                {index === 0 && (
                  <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Participants ({event.participants.length})
        </h2>
        {event.participants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 dark:text-gray-400">No participants yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {event.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    participant.isWinner
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {participant.isWinner ? '✓' : '•'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{participant.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(participant.registeredAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {participant.isWinner ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600">
                        Winner
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700">
                        Waiting
                      </span>
                    )}
                  </div>
                </div>
                {event.status === EventStatus.REGISTRATION_OPEN && !participant.isWinner && (
                  <button
                    onClick={() => handleRemoveParticipant(participant.id)}
                    className="ml-3 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-12 max-w-2xl">
            <h3 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Scan to Register
            </h3>
            <div className="flex justify-center mb-8 p-6 bg-white rounded-2xl">
              <QRCodeSVG value={registrationUrl} size={400} />
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}