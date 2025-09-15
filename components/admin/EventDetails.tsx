'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Clock, Users, Trophy, QrCode, CheckCircle, XCircle } from 'lucide-react';

interface EventDetailsProps {
  event: {
    id: string;
    name: string;
    createdAt: Date | string;
    registrationOpen: boolean;
    closed: boolean;
    qrCode?: string;
  };
  participants?: Array<{
    id: string;
    name: string;
    registeredAt: Date | string;
  }>;
  winners?: Array<{
    id: string;
    participantName: string;
    drawOrder: number;
    drawnAt: Date | string;
  }>;
  className?: string;
}

export function EventDetails({
  event,
  participants = [],
  winners = [],
  className,
}: EventDetailsProps) {
  const getEventStatus = () => {
    if (event.closed) {
      return { label: 'Completed', color: 'bg-gray-100 text-gray-800' };
    }
    if (event.registrationOpen) {
      return { label: 'Registration Open', color: 'bg-green-100 text-green-800' };
    }
    return { label: 'Registration Closed', color: 'bg-yellow-100 text-yellow-800' };
  };

  const status = getEventStatus();

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString();
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Event Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">{event.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Created {formatDate(event.createdAt)}</span>
              </div>
            </div>
            <Badge className={status.color}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              {event.registrationOpen ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span>Registration {event.registrationOpen ? 'Open' : 'Closed'}</span>
            </div>
            <div className="flex items-center gap-2">
              {event.closed ? (
                <CheckCircle className="h-4 w-4 text-gray-500" />
              ) : (
                <Clock className="h-4 w-4 text-blue-500" />
              )}
              <span>Event {event.closed ? 'Completed' : 'Active'}</span>
            </div>
            {event.qrCode && (
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-purple-500" />
                <span>QR Code Available</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold">{participants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Winners Drawn</p>
                <p className="text-2xl font-bold">{winners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-bold">{participants.length - winners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Section */}
      {event.qrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Registration QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Image
                src={event.qrCode}
                alt={`QR Code for ${event.name}`}
                width={300}
                height={300}
                className="max-w-xs border border-gray-200 rounded-lg"
                unoptimized
              />
            </div>
            <p className="text-sm text-gray-600 text-center mt-4">
              Participants can scan this QR code to register for the event
            </p>
          </CardContent>
        </Card>
      )}

      {/* Event Info */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Event ID:</span>
              <span className="text-sm text-gray-600 font-mono">{event.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm text-gray-600">
                {event.closed
                  ? 'Completed'
                  : event.registrationOpen
                    ? 'Registration Open'
                    : 'Registration Closed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Created:</span>
              <span className="text-sm text-gray-600">{formatDate(event.createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
