'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EventStatus } from '@prisma/client';

interface Event {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  _count: {
    participants: number;
    winners: number;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const data = await res.json();
      setEvents(data);
    } catch {
      alert('failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to create event');
        return;
      }

      setName('');
      setDescription('');
      setShowCreate(false);
      fetchEvents();
    } catch {
      alert('failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const badges = {
      INIT: 'badge-neutral',
      REGISTRATION_OPEN: 'badge-success',
      REGISTRATION_CLOSED: 'badge-warning',
      DRAWING: 'badge-info',
      CLOSED: 'badge-error',
    };
    return badges[status];
  };

  if (loading) {
    return (
      <div className="flex justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary"
        >
          create event
        </button>
      </div>

      {showCreate && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">create new event</h3>
            <form onSubmit={handleCreate}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">event name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text">description (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="loading loading-spinner"></span> : 'create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/events/${event.id}`}>
            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="card-title">{event.name}</h2>
                    {event.description && (
                      <p className="text-sm opacity-70">{event.description}</p>
                    )}
                  </div>
                  <div className={`badge ${getStatusBadge(event.status)}`}>
                    {event.status}
                  </div>
                </div>
                <div className="stats stats-horizontal shadow mt-4">
                  <div className="stat">
                    <div className="stat-title">participants</div>
                    <div className="stat-value text-2xl">{event._count.participants}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">winners</div>
                    <div className="stat-value text-2xl">{event._count.winners}</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg opacity-70">no events yet. create one to get started!</p>
        </div>
      )}
    </div>
  );
}