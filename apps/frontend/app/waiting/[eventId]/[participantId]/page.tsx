"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocket } from "@/hooks/useSocket";

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
}

interface Participant {
  id: string;
  name: string;
}

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: string;
}

export default function WaitingPage(): JSX.Element {
  const params = useParams();
  const eventId = params.eventId as string;
  const participantId = params.participantId as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isWinner, setIsWinner] = useState(false);
  const [winnerDetails, setWinnerDetails] = useState<Winner | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchData = async (): Promise<void> => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json() as Event;
        setEvent(eventData);
        setRegistrationOpen(eventData.registrationOpen);
      }

      // Fetch participant details (public endpoint)
      const participantResponse = await fetch(`/api/events/${eventId}/participants/${participantId}`);
      if (participantResponse.ok) {
        const participantData = await participantResponse.json() as Participant;
        setParticipant(participantData);
      }

      // Check if already winner (public endpoint)
      const winnerResponse = await fetch(`/api/events/${eventId}/participants/${participantId}/winner`);
      if (winnerResponse.ok) {
        const winnerData = await winnerResponse.json();
        if (winnerData.id) { // If has winner ID, is a winner
          setIsWinner(true);
          setWinnerDetails(winnerData as Winner);
          await fireConfetti();
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fireConfetti = async (): Promise<void> => {
    // Massive confetti celebration for winner!
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
    
    // Big center burst
    await confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.5 }
    });

    // Multiple side bursts
    setTimeout(() => {
      void confetti({
        particleCount: 100,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors
      });
    }, 300);

    setTimeout(() => {
      void confetti({
        particleCount: 100,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors
      });
    }, 600);

    // Continuous celebration
    let count = 0;
    const interval = setInterval(() => {
      void confetti({
        particleCount: 50,
        spread: 60,
        origin: { 
          x: Math.random(),
          y: 0.7 + Math.random() * 0.3 
        },
        colors
      });
      count++;
      if (count >= 8) {
        clearInterval(interval);
      }
    }, 400);
  };

  // Socket.io for real-time updates
  useSocket({
    eventId,
    onWinnerDrawn: (winner) => {
      const newWinner = winner as Winner;
      console.log('Winner drawn:', newWinner);
      
      // Check if this participant won!
      if (newWinner.participantId === participantId) {
        console.log('I WON!');
        setIsWinner(true);
        setWinnerDetails(newWinner);
        void fireConfetti();
      }
    },
    onRegistrationToggled: (data) => {
      console.log('Registration toggled:', data);
      setRegistrationOpen(data.registrationOpen);
    },
  });

  useEffect(() => {
    void fetchData();
  }, [eventId, participantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div>Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              The event you're looking for doesn't exist or has ended.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isWinner && winnerDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-gold-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-4 border-yellow-400 shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-t-lg">
            <CardTitle className="text-4xl font-bold">🎉 YOU WON! 🎉</CardTitle>
            <CardDescription className="text-yellow-100 text-lg">
              Congratulations!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">
                {winnerDetails.drawOrder === 1 ? '🥇' : 
                 winnerDetails.drawOrder === 2 ? '🥈' : 
                 winnerDetails.drawOrder === 3 ? '🥉' : '🏆'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {participant?.name || winnerDetails.participantName}
              </h2>
              <p className="text-lg text-gray-700 mb-2">
                <strong>Position #{winnerDetails.drawOrder}</strong>
              </p>
              <p className="text-lg font-semibold text-yellow-700">
                {event.name}
              </p>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium">
                🎊 You have won the lottery! 🎊
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Contact the organizer to claim your prize
              </p>
            </div>

            <p className="text-xs text-gray-500">
              Drawn at: {new Date(winnerDetails.drawnAt).toLocaleString()}
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
          <CardTitle className="text-2xl font-bold text-gray-900">
            {registrationOpen ? "Registration Confirmed!" : "Waiting for Draw..."}
          </CardTitle>
          <CardDescription className="text-lg">{event.name}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-6">
            <div className="text-4xl mb-4">
              {registrationOpen ? "✅" : "⏳"}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {participant?.name || "Participant"}
            </h2>
            <p className="text-gray-600">
              You're registered for this lottery!
            </p>
          </div>

          {registrationOpen ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>✨ Registration is still open</strong>
              </p>
              <p className="text-xs text-green-700 mt-1">
                More people can still join. The draw will start when registration closes.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>🎲 Registration closed - Draw in progress!</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Stay on this page. You'll be notified instantly if you win!
              </p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className={`w-3 h-3 rounded-full animate-pulse ${registrationOpen ? 'bg-green-500' : 'bg-blue-500'}`}></div>
            <span>Live updates active</span>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>🍀 Good luck! Keep this page open to get instant results.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}