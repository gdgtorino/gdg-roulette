'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EventStatus } from '@prisma/client';
import confetti from 'canvas-confetti';

interface ParticipantStatus {
  id: string;
  name: string;
  isWinner: boolean;
  event: {
    status: EventStatus;
    _count: {
      participants: number;
      winners: number;
    };
  };
  winner: {
    drawOrder: number;
  } | null;
}

export default function StatusPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<ParticipantStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confettiShown, setConfettiShown] = useState(false);

  useEffect(() => {
    checkRegistration();
    const interval = setInterval(fetchStatus, 3000); // poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // trigger confetti when becoming a winner (either during drawing or when event closes)
    if (status?.isWinner && !confettiShown &&
        (status.event.status === EventStatus.DRAWING || status.event.status === EventStatus.CLOSED)) {
      triggerConfetti();
      setConfettiShown(true);
    }
  }, [status, confettiShown]);

  const checkRegistration = () => {
    const registrationId = localStorage.getItem(`event_${params.id}_registrationId`);
    if (!registrationId) {
      // not registered, redirect to registration page
      router.push(`/events/${params.id}/register`);
      return;
    }
    fetchStatus();
  };

  const fetchStatus = async () => {
    const registrationId = localStorage.getItem(`event_${params.id}_registrationId`);
    if (!registrationId) return;

    try {
      const res = await fetch(`/api/events/${params.id}/status/${registrationId}`);
      if (!res.ok) {
        if (res.status === 404) {
          // participant deleted, clear localStorage
          localStorage.removeItem(`event_${params.id}_registrationId`);
          router.push(`/events/${params.id}/register`);
        }
        return;
      }
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('failed to load status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!confirm('are you sure you want to cancel your registration?')) {
      return;
    }

    const registrationId = localStorage.getItem(`event_${params.id}_registrationId`);
    if (!registrationId) return;

    try {
      const res = await fetch(`/api/events/${params.id}/register/${registrationId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        localStorage.removeItem(`event_${params.id}_registrationId`);
        router.push(`/events/${params.id}/register`);
      } else {
        alert('failed to cancel registration');
      }
    } catch {
      alert('failed to cancel registration');
    }
  };

  const triggerConfetti = () => {
    const duration = 5000;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-4">
        <div className="w-full max-w-md backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8 transform transition-all duration-500 hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Error</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300">{error || 'Failed to load status'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8 transform transition-all duration-500">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Hello, {status.name}!
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full"></div>
        </div>

        {/* Waiting State */}
        {(status.event.status === EventStatus.REGISTRATION_OPEN ||
          status.event.status === EventStatus.REGISTRATION_CLOSED) && (
          <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900 dark:text-white mb-1">Waiting for drawing</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {status.event._count.participants} participants registered
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drawing in Progress */}
        {status.event.status === EventStatus.DRAWING && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-orange-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
              </div>
              <p className="font-bold text-xl text-gray-900 dark:text-white mb-2">Drawing in progress...</p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{status.event._count.winners}</span>
                <span>/</span>
                <span className="font-medium">{status.event._count.participants}</span>
                <span>drawn</span>
              </div>
              <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(status.event._count.winners / status.event._count.participants) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {status.event.status === EventStatus.CLOSED && (
          <>
            {status.isWinner ? (
              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 animate-pulse"></div>
                <div className="relative flex flex-col items-center text-center">
                  <div className="text-6xl mb-4 animate-bounce">🎉</div>
                  <p className="font-bold text-3xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    You Won!
                  </p>
                  {status.winner && (
                    <div className="mt-4 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 border border-green-500/30">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Draw Order: <span className="font-bold text-green-600 dark:text-green-400">#{status.winner.drawOrder}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-gray-500/10 border border-gray-500/20 backdrop-blur-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-xl text-gray-900 dark:text-white mb-2">Drawing completed</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">You were not selected this time</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {status.event._count.winners} winners from {status.event._count.participants} participants
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={fetchStatus}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 border-2 border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-white/80 dark:hover:bg-gray-800/80 hover:border-purple-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {status.event.status === EventStatus.REGISTRATION_OPEN && (
            <button
              onClick={handleCancelRegistration}
              className="flex-1 py-3 px-4 rounded-2xl bg-red-500/10 border-2 border-red-500/20 text-red-600 dark:text-red-400 font-medium hover:bg-red-500/20 hover:border-red-500/40 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}