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

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!confirm(`are you sure you want to permanently delete "${eventName}"? this cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('failed to delete event');
        return;
      }

      fetchEvents();
    } catch {
      alert('failed to delete event');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Events</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:scale-[1.05] active:scale-[0.98] transition-all duration-300"
        >
          + Create Event
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create New Event</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Event Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-transparent focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={creating}
                  placeholder="GDG Milano Meetup"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Description (Optional)</label>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-transparent focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-white resize-none"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                  placeholder="Monthly community meetup"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {events.map((event) => (
          <Link key={event.id} href={`/admin/events/${event.id}`}>
            <div className="backdrop-blur-xl bg-white/40 dark:bg-gray-900/40 rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/30 p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{event.name}</h2>
                  {event.description && (
                    <p className="text-gray-600 dark:text-gray-400">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getStatusColor(event.status)}`}>
                    {event.status.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(event.id, event.name);
                    }}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Participants</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{event._count.participants}</p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Winners</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{event._count.winners}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-xl text-gray-600 dark:text-gray-400">No events yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}