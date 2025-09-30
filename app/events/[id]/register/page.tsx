'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EventStatus } from '@prisma/client';

interface Event {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
}

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvent();
    checkExistingRegistration();
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`);
      if (!res.ok) {
        setError('event not found');
        return;
      }
      const data = await res.json();
      setEvent(data);
    } catch {
      setError('failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRegistration = () => {
    const registrationId = localStorage.getItem(`event_${params.id}_registrationId`);
    if (registrationId) {
      // already registered, redirect to status page
      router.push(`/events/${params.id}/status`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/events/${params.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'registration failed');
        return;
      }

      // save registration id to localStorage
      localStorage.setItem(`event_${params.id}_registrationId`, data.id);

      // redirect to status page
      router.push(`/events/${params.id}/status`);
    } catch {
      setError('something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">error</h2>
            <p>{error || 'event not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (event.status !== EventStatus.REGISTRATION_OPEN) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{event.name}</h2>
            <div className="alert alert-warning">
              <span>registration is currently closed</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-2">{event.name}</h2>
          {event.description && (
            <p className="opacity-70 mb-4">{event.description}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-control">
              <label className="label">
                <span className="label-text">your name</span>
              </label>
              <input
                type="text"
                placeholder="enter your name"
                className="input input-bordered"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {error && (
              <div className="alert alert-error mt-4">
                <span>{error}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  'register'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}