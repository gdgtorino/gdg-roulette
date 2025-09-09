"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Event {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  registrationOpen: boolean;
  qrCode: string;
}

interface Admin {
  id: string;
  username: string;
}

export default function AdminDashboard(): JSX.Element {
  const [events, setEvents] = useState<Event[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchEvents = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json() as Event[];
        setEvents(data);
      } else if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        window.location.href = "/admin";
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  const createEvent = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: eventName }),
      });

      if (response.ok) {
        const newEvent = await response.json() as Event;
        setEventName("");
        await fetchEvents();
        // Redirect to QR code page
        window.location.href = `/admin/events/${newEvent.id}/qr`;
      } else {
        const error = await response.json() as { error: string };
        alert(error.error || "Failed to create event");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: string): Promise<void> => {
    const eventToDelete = events.find(e => e.id === eventId);
    if (!eventToDelete) return;

    if (!confirm(`Are you sure you want to delete event "${eventToDelete.name}"? This will also delete all participants and winners.`)) {
      return;
    }

    setDeleteLoading(eventId);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchEvents();
        alert("Event deleted successfully");
      } else {
        const error = await response.json() as { error: string };
        alert(error.error || "Failed to delete event");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setDeleteLoading(null);
    }
  };

  const logout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    window.location.href = "/admin";
  };

  useEffect(() => {
    // Check if logged in
    const token = localStorage.getItem("token");
    const adminData = localStorage.getItem("admin");
    
    if (!token || !adminData) {
      window.location.href = "/admin";
      return;
    }

    try {
      setAdmin(JSON.parse(adminData) as Admin);
    } catch {
      window.location.href = "/admin";
      return;
    }

    void fetchEvents();
  }, []);

  if (!admin) {
    return <div>Loading...</div>;
  }

  // Separate events into current and old
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const currentEvents = events.filter(event => 
    new Date(event.createdAt) > dayAgo
  );
  
  const oldEvents = events.filter(event => 
    new Date(event.createdAt) <= dayAgo
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">The Draw - Admin Dashboard</h1>
              <p className="text-gray-600">Welcome, {admin.username}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/admin/manage">
                <Button variant="outline">Manage Admins</Button>
              </Link>
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Create Event Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Create a lottery event and get a QR code for participant registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEvent} className="flex gap-4">
              <Input
                type="text"
                placeholder="Event name (e.g., 'Christmas Lottery 2024')"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="flex-1"
                minLength={3}
                maxLength={100}
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Current Events */}
          <Card>
            <CardHeader>
              <CardTitle>Current Events</CardTitle>
              <CardDescription>
                Events created in the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(event.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        Registration: 
                        <span className={event.registrationOpen ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                          {event.registrationOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/events/${event.id}/qr`}>
                        <Button size="sm" variant="outline">
                          QR Code
                        </Button>
                      </Link>
                      {!event.registrationOpen && (
                        <Link href={`/admin/events/${event.id}/draw`}>
                          <Button size="sm">
                            Draw
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteEvent(event.id)}
                        disabled={deleteLoading === event.id}
                      >
                        {deleteLoading === event.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
                {currentEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No current events. Create one to get started!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Old Events */}
          <Card>
            <CardHeader>
              <CardTitle>Previous Events</CardTitle>
              <CardDescription>
                Events older than 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {oldEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border p-4 bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">{event.name}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link href={`/admin/events/${event.id}/results`}>
                        <Button size="sm" variant="outline">
                          View Results
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteEvent(event.id)}
                        disabled={deleteLoading === event.id}
                      >
                        {deleteLoading === event.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
                {oldEvents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No previous events
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}