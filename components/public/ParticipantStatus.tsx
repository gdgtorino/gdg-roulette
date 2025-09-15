'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import {
  User,
  Clock,
  Trophy,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
} from 'lucide-react';

interface ParticipantStatusProps {
  participant?: {
    id: string;
    name: string;
    registeredAt: Date | string;
    eventId: string;
  };
  event?: {
    id: string;
    name: string;
    registrationOpen: boolean;
    closed: boolean;
  };
  winner?: {
    id: string;
    drawOrder: number;
    drawnAt: Date | string;
  } | null;
  totalParticipants?: number;
  totalWinners?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function ParticipantStatus({
  participant,
  event,
  winner,
  totalParticipants = 0,
  totalWinners = 0,
  isLoading = false,
  onRefresh,
}: ParticipantStatusProps) {
  const [timeElapsed, setTimeElapsed] = useState<string>('');

  useEffect(() => {
    if (!participant) return;

    const updateElapsedTime = () => {
      const registeredAt = new Date(participant.registeredAt);
      const now = new Date();
      const diff = now.getTime() - registeredAt.getTime();

      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeElapsed(`${days} day${days > 1 ? 's' : ''} ago`);
      } else if (hours > 0) {
        setTimeElapsed(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else {
        setTimeElapsed(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      }
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [participant]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  };

  const getEventStatus = () => {
    if (!event) return { label: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };

    if (event.closed) {
      return {
        label: 'Event Completed',
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircle,
      };
    }

    if (event.registrationOpen) {
      return {
        label: 'Registration Open',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
      };
    }

    return {
      label: 'Drawing Phase',
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
    };
  };

  const status = getEventStatus();
  const StatusIcon = status.icon;

  if (!participant || !event) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Participant information not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Winner Announcement */}
      {winner && (
        <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Congratulations!</h2>
            <p className="text-lg text-gray-700 mb-2">You are winner #{winner.drawOrder}</p>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Won on {formatDate(winner.drawnAt)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participant Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Registration Status
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{participant.name}</h3>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Registered {timeElapsed}</span>
              </div>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Registration Date:</span>
                <p className="text-gray-600">{formatDate(participant.registeredAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Participant ID:</span>
                <p className="text-gray-600 font-mono text-xs">{participant.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Event Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>
                  {totalParticipants} Participant{totalParticipants !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>
                  {totalWinners} Winner{totalWinners !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <div className="border-t pt-4">
            {event.closed ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>This event has been completed</span>
              </div>
            ) : event.registrationOpen ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Registration is still open - waiting for drawing to begin</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Drawing phase - winners may be announced soon</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
