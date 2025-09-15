'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  description: string;
  state: 'INIT' | 'REGISTRATION' | 'DRAW' | 'CLOSED';
  maxParticipants: number;
  participantCount: number;
  winnersCount: number;
}

export default function AdminDashboardPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [admin, setAdmin] = useState<{ username: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: '', description: '', maxParticipants: 100 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  useEffect(() => {
    fetchAdminData();
    fetchEvents();
  }, []);

  const fetchAdminData = async () => {
    try {
      const response = await fetch('/api/admin/profile');
      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      router.push('/admin/login');
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleLogout = () => {
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!newEvent.name || !newEvent.description) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    if (newEvent.maxParticipants <= 0) {
      setMessage({ type: 'error', text: 'Must be a positive number' });
      return;
    }

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Event created successfully' });
        setNewEvent({ name: '', description: '', maxParticipants: 100 });
        setShowCreateForm(false);
        fetchEvents();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to create event' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create event' });
    }
  };

  const handleStateTransition = async (eventId: string, action: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Event updated successfully' });
        fetchEvents();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Operation failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operation failed' });
    }
  };

  const handleDrawWinner = async (eventId: string, drawAll = false) => {
    try {
      const response = await fetch(`/api/events/${eventId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawAll }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Winner${drawAll ? 's' : ''} drawn successfully` });
        fetchEvents();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'No participants available for drawing' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Draw failed' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              {admin && (
                <div data-testid="welcome-message" className="text-gray-700">
                  Welcome, {admin.username}
                </div>
              )}
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav data-testid="admin-nav" className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 h-12 items-center">
            <span className="text-blue-600 border-b-2 border-blue-600 pb-1">Events</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {message.text && (
          <div
            data-testid={message.type === 'success' ? 'success-message' : 'error-message'}
            className={`mb-4 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-100 border border-green-400 text-green-700'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Create Event Button */}
        <div className="mb-6">
          <button
            data-testid="create-event-button"
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Create New Event
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Create New Event</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name
                  </label>
                  <input
                    data-testid="event-name-input"
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {!newEvent.name && message.type === 'error' && (
                    <div data-testid="name-error" className="text-red-500 text-sm mt-1">
                      Event name is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    data-testid="event-description-input"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                  {!newEvent.description && message.type === 'error' && (
                    <div data-testid="description-error" className="text-red-500 text-sm mt-1">
                      Description is required
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    data-testid="max-participants-input"
                    type="number"
                    value={newEvent.maxParticipants}
                    onChange={(e) => setNewEvent({ ...newEvent, maxParticipants: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {newEvent.maxParticipants <= 0 && message.type === 'error' && (
                    <div data-testid="max-participants-error" className="text-red-500 text-sm mt-1">
                      Must be a positive number
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  data-testid="create-event-submit"
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Create Event
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events List */}
        <div data-testid="events-list" className="space-y-4">
          {events.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No events found. Create your first event to get started.
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} data-testid="event-card" className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <p className="text-gray-600">{event.description}</p>
                    <div className="mt-2">
                      <span data-testid="event-state" className={`px-2 py-1 rounded text-sm ${
                        event.state === 'INIT' ? 'bg-gray-100 text-gray-800' :
                        event.state === 'REGISTRATION' ? 'bg-blue-100 text-blue-800' :
                        event.state === 'DRAW' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {event.state}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Participants: {event.participantCount}/{event.maxParticipants}
                    </p>
                    <p className="text-sm text-gray-600">
                      Winners: {event.winnersCount}
                    </p>
                  </div>
                </div>

                {/* Event Actions */}
                <div className="flex flex-wrap gap-2">
                  {event.state === 'INIT' && (
                    <button
                      data-testid="open-registration-button"
                      onClick={() => handleStateTransition(event.id, 'open-registration')}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Open Registration
                    </button>
                  )}

                  {event.state === 'REGISTRATION' && (
                    <>
                      <button
                        data-testid="start-draw-button"
                        onClick={() => handleStateTransition(event.id, 'start-draw')}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                      >
                        Start Draw
                      </button>
                      <div data-testid="registration-open-indicator" className="text-green-600 text-sm">
                        ✓ Registration Open
                      </div>
                    </>
                  )}

                  {event.state === 'DRAW' && (
                    <>
                      <button
                        data-testid="draw-single-winner-button"
                        onClick={() => handleDrawWinner(event.id, false)}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        Draw Winner
                      </button>
                      <button
                        data-testid="draw-all-button"
                        onClick={() => handleDrawWinner(event.id, true)}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                      >
                        Draw All
                      </button>
                      <button
                        data-testid="close-event-button"
                        onClick={() => handleStateTransition(event.id, 'close')}
                        className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                      >
                        Close Event
                      </button>
                      <div data-testid="draw-winners-button" className="text-yellow-600 text-sm">
                        Draw in Progress
                      </div>
                    </>
                  )}

                  <button
                    data-testid="view-event-button"
                    onClick={() => router.push(`/admin/events/${event.id}`)}
                    className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                  >
                    View Details
                  </button>

                  <button
                    data-testid="delete-event-button"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                        // Handle delete
                      }
                    }}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}