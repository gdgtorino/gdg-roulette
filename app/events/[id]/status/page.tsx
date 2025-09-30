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
    // trigger confetti when becoming a winner
    if (status?.isWinner && status.event.status === EventStatus.CLOSED && !confettiShown) {
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
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">error</h2>
            <p>{error || 'failed to load status'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">hello, {status.name}!</h2>

          {/* Waiting State */}
          {(status.event.status === EventStatus.REGISTRATION_OPEN ||
            status.event.status === EventStatus.REGISTRATION_CLOSED) && (
            <div className="alert alert-info">
              <div>
                <p className="font-bold">waiting for drawing</p>
                <p className="text-sm">
                  {status.event._count.participants} participants registered
                </p>
              </div>
            </div>
          )}

          {/* Drawing in Progress */}
          {status.event.status === EventStatus.DRAWING && (
            <div className="alert alert-warning">
              <div className="flex flex-col items-center w-full">
                <span className="loading loading-spinner loading-lg mb-2"></span>
                <p className="font-bold">drawing in progress...</p>
                <p className="text-sm">
                  {status.event._count.winners} / {status.event._count.participants} drawn
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {status.event.status === EventStatus.CLOSED && (
            <>
              {status.isWinner ? (
                <div className="alert alert-success">
                  <div className="flex flex-col items-center w-full">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="font-bold text-xl">you won!</p>
                    {status.winner && (
                      <p className="text-sm mt-2">
                        draw order: #{status.winner.drawOrder}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="alert">
                  <div className="flex flex-col items-center w-full">
                    <p className="font-bold">drawing completed</p>
                    <p className="text-sm mt-1">you were not selected this time</p>
                    <p className="text-xs mt-2 opacity-70">
                      {status.event._count.winners} winners from {status.event._count.participants} participants
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button onClick={fetchStatus} className="btn btn-ghost btn-sm flex-1">
              refresh status
            </button>
            {status.event.status === EventStatus.REGISTRATION_OPEN && (
              <button onClick={handleCancelRegistration} className="btn btn-error btn-sm flex-1">
                cancel registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}