"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocket } from "@/hooks/useSocket";

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
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  const registrationUrl = `${window.location.origin}/register/${eventId}`;

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
        alert(error.error || "Failed to toggle registration");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setToggleLoading(false);
    }
  };

  const copyLink = (): void => {
    void navigator.clipboard.writeText(registrationUrl);
    alert("Registration link copied to clipboard!");
  };

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onParticipantRegistered: (participant) => {
      // Add new participant to the list
      setParticipants(prev => [...prev, participant as Participant]);
    },
  });

  useEffect(() => {
    void fetchEventData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-600">Event QR Code & Registration</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/admin/dashboard'}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle>Registration QR Code</CardTitle>
              <CardDescription>
                Participants scan this QR code to register for the lottery
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
                <p className="text-sm text-gray-600 mb-2">Registration Link:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm break-all">
                    {registrationUrl}
                  </code>
                  <Button size="sm" onClick={copyLink}>
                    Copy
                  </Button>
                </div>
              </div>

              {/* Registration Status */}
              <div className="mb-6">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  event.registrationOpen 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  Registration {event.registrationOpen ? 'Open' : 'Closed'}
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
                  ? "Processing..." 
                  : event.registrationOpen 
                    ? "Close Registration & Start Draw" 
                    : "Reopen Registration"
                }
              </Button>

              {!event.registrationOpen && (
                <div className="mt-4">
                  <Button
                    onClick={() => window.location.href = `/admin/events/${eventId}/draw`}
                    size="lg"
                  >
                    Go to Draw Page
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participants List */}
          <Card>
            <CardHeader>
              <CardTitle>Registered Participants</CardTitle>
              <CardDescription>
                {participants.length} participants registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">#{index + 1} {participant.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(participant.registeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No participants yet. Share the QR code to get started!
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