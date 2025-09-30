'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EventStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

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

  const registrationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004'}/events/${params.id}/register`;

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}`);
      const data = await res.json();
      setEvent(data);
    } catch {
      alert('failed to load event');
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
        alert(data.error || 'failed to update status');
        return;
      }

      fetchEvent();
    } catch {
      alert('failed to update status');
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

    // Simula un drumroll di 2 secondi
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const res = await fetch(`/api/admin/events/${params.id}/draw`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to draw winner');
        setShowWinnerAnimation(false);
        return;
      }

      const winner = await res.json();
      setDrawnWinner(winner.participant.name);
      triggerConfetti();

      // Aspetta che l'animazione finisca prima di aggiornare
      await new Promise(resolve => setTimeout(resolve, 3000));

      fetchEvent();
      setShowWinnerAnimation(false);
      setDrawnWinner(null);
    } catch {
      alert('failed to draw winner');
      setShowWinnerAnimation(false);
    } finally {
      setDrawing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationUrl);
    alert('registration link copied!');
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('are you sure you want to remove this participant?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${params.id}/participants/${participantId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('failed to remove participant');
        return;
      }

      fetchEvent();
    } catch {
      alert('failed to remove participant');
    }
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
    <div className="space-y-6">
      {/* TRASH CUTE WINNER ANIMATION OVERLAY */}
      {showWinnerAnimation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-300">
          <div className="text-center">
            {!drawnWinner ? (
              <>
                <div className="text-8xl mb-8 animate-bounce">🎰</div>
                <div className="text-4xl font-bold text-white mb-4 animate-pulse">
                  Drawing...
                </div>
                <div className="flex gap-3 justify-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </>
            ) : (
              <div className="animate-in zoom-in duration-500">
                <div className="text-9xl mb-6 animate-bounce">🎉</div>
                <div className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
                  WINNER!
                </div>
                <div className="text-5xl font-bold text-white px-8 py-4 rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-2xl animate-pulse">
                  {drawnWinner}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
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
      <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Event Controls</h2>
        <div className="flex gap-3 flex-wrap">
          {event.status === EventStatus.INIT && (
            <button
              onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              🚀 Open Registration
            </button>
          )}
          {event.status === EventStatus.REGISTRATION_OPEN && (
            <button
              onClick={() => handleStatusChange(EventStatus.REGISTRATION_CLOSED)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              🔒 Close Registration
            </button>
          )}
          {event.status === EventStatus.REGISTRATION_CLOSED && (
            <>
              <button
                onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                🔓 Reopen Registration
              </button>
              <button
                onClick={() => handleStatusChange(EventStatus.DRAWING)}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                🎰 Start Drawing
              </button>
            </>
          )}
          {event.status === EventStatus.DRAWING && (
            <button
              onClick={() => handleStatusChange(EventStatus.CLOSED)}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
            >
              ✅ Close Event
            </button>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {event.status === EventStatus.REGISTRATION_OPEN && (
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">📱 Registration</h2>
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
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                >
                  📋 Copy
                </button>
              </div>
              <button
                onClick={() => setShowQR(true)}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
              >
                🖥️ Fullscreen QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Interface */}
      {event.status === EventStatus.DRAWING && (
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🎰 Drawing</h2>
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
              '🎉 DRAW NEXT WINNER 🎉'
            )}
          </button>
          {event._count.participants === event._count.winners && (
            <p className="text-center mt-4 text-lg text-gray-600 dark:text-gray-400">
              ✅ All participants have been drawn!
            </p>
          )}
        </div>
      )}

      {/* Winners List */}
      {event.winners.length > 0 && (
        <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🏆 Winners</h2>
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
                {index === 0 && <span className="text-3xl">👑</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          👥 Participants ({event.participants.length})
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
  );
}