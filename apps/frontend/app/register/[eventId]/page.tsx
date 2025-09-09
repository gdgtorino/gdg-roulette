"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
}

export default function RegisterPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");

  const fetchEvent = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      
      if (response.ok) {
        const eventData = await response.json() as Event;
        setEvent(eventData);
      } else {
        setError("Event not found");
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
      setError("Failed to load event");
    }
  };

  const generateDefaultName = async (): Promise<string> => {
    // Generate a random passphrase-style name (client-side)
    const adjectives = [
      'brave', 'bright', 'calm', 'clever', 'cool', 'eager', 'fair', 'gentle', 'happy', 'kind',
      'lively', 'nice', 'proud', 'quick', 'quiet', 'smart', 'swift', 'warm', 'wise', 'young'
    ];
    
    const nouns = [
      'tiger', 'eagle', 'wolf', 'bear', 'lion', 'fox', 'deer', 'hawk', 'owl', 'cat',
      'dog', 'fish', 'bird', 'star', 'moon', 'sun', 'tree', 'rock', 'wind', 'fire'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}-${noun}-${number}`;
  };

  const register = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const registrationName = name.trim() || await generateDefaultName();
      
      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: registrationName }),
      });

      if (response.ok) {
        const participant = await response.json();
        setRegistered(true);
        setName(participant.name);
      } else {
        const error = await response.json() as { error: string };
        setError(error.error || "Registration failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvent();
  }, [eventId]);

  if (!event && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600">🎉 Registration Successful!</CardTitle>
            <CardDescription>You're all set for the lottery</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-900">Event: {event.name}</p>
              <p className="text-gray-600">Your name: <span className="font-medium">{name}</span></p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Keep this page open or screenshot it. 
                The draw will happen when the organizer is ready.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Good luck! 🍀
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event.registrationOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Registration Closed</CardTitle>
            <CardDescription>{event.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Sorry, registration for this event has been closed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Join the Lottery</CardTitle>
          <CardDescription className="text-lg">{event.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={register} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter your name (optional - we'll generate one for you)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="text-center"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Leave empty for a fun auto-generated name!
              </p>
            </div>
            
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Registering..." : "Join Lottery 🎯"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By joining, you confirm you're eligible to participate
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}