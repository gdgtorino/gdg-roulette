'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Play,
  Pause,
  Square,
  Trophy,
  Trash2,
  QrCode,
  Settings,
  ExternalLink,
  Users
} from 'lucide-react';

interface EventControlsProps {
  event: {
    id: string;
    name: string;
    registrationOpen: boolean;
    closed: boolean;
  };
  participants: Array<{ id: string; name: string }>;
  winners: Array<{ id: string; participantName: string; drawOrder: number }>;
  onToggleRegistration?: () => Promise<void>;
  onCloseEvent?: () => Promise<void>;
  onDrawWinner?: () => Promise<void>;
  onDeleteEvent?: () => Promise<void>;
  className?: string;
}

export function EventControls({
  event,
  participants,
  winners,
  onToggleRegistration,
  onCloseEvent,
  onDrawWinner,
  onDeleteEvent,
  className
}: EventControlsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (actionName: string, action?: () => Promise<void>) => {
    if (!action) return;
    setIsLoading(actionName);
    try {
      await action();
    } catch (error) {
      console.error(`Error executing ${actionName}:`, error);
    } finally {
      setIsLoading(null);
    }
  };

  const canDrawWinner = !event.registrationOpen && !event.closed && participants.length > winners.length;
  const hasParticipants = participants.length > 0;
  const registrationUrl = `${window.location.origin}/register/${event.id}`;
  const qrUrl = `${window.location.origin}/admin/events/${event.id}/qr`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Event Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registration Controls */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Registration</h4>
          <div className="flex flex-wrap gap-2">
            {!event.closed && onToggleRegistration && (
              <Button
                variant={event.registrationOpen ? "destructive" : "default"}
                size="sm"
                onClick={() => handleAction('toggleRegistration', onToggleRegistration)}
                disabled={isLoading === 'toggleRegistration'}
                className="gap-2"
              >
                {event.registrationOpen ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Close Registration
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Open Registration
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(qrUrl, '_blank')}
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              QR Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(registrationUrl);
                // You could add a toast notification here
              }}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Copy Link
            </Button>
          </div>
        </div>

        {/* Drawing Controls */}
        {!event.closed && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Drawing</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAction('drawWinner', onDrawWinner)}
                disabled={!canDrawWinner || isLoading === 'drawWinner'}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                {isLoading === 'drawWinner' ? 'Drawing...' : 'Draw Winner'}
              </Button>

              {!canDrawWinner && (
                <div className="text-xs text-gray-500 flex items-center">
                  {event.registrationOpen && 'Close registration first'}
                  {!hasParticipants && 'No participants to draw from'}
                  {participants.length === winners.length && 'All participants have been drawn'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Status Controls */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">Event Status</h4>
          <div className="flex flex-wrap gap-2">
            {!event.closed && onCloseEvent && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Complete Event
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Event</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the event as completed and prevent further registrations or drawings.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAction('closeEvent', onCloseEvent)}
                      disabled={isLoading === 'closeEvent'}
                    >
                      {isLoading === 'closeEvent' ? 'Completing...' : 'Complete Event'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span>{participants.length} Participants</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>{winners.length} Winners</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-medium text-sm text-red-700">Danger Zone</h4>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Event
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{event.name}&quot;? This will permanently remove
                  the event, all participants, and all winners. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleAction('deleteEvent', onDeleteEvent)}
                  disabled={isLoading === 'deleteEvent'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isLoading === 'deleteEvent' ? 'Deleting...' : 'Delete Event'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}