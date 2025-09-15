import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDrawPageData } from '@/lib/actions/draw';
import { HeaderControls } from '@/components/ClientComponents';
import { DrawMachine } from './components/DrawMachine';
import { WinnersList } from './components/WinnersList';
import { CloseEventButton } from './components/CloseEventButton';
import Link from 'next/link';

interface DrawPageServerProps {
  eventId: string;
}

async function DrawPageData({ eventId }: { eventId: string }) {
  const result = await getDrawPageData(eventId);

  if (!result.success) {
    throw new Error(result.error);
  }

  if (!result.data) {
    throw new Error('No event data found');
  }

  const { event, participants, winners } = result.data;

  // Serialize dates for client components
  const serializedParticipants = participants.map((p) => ({
    ...p,
    registeredAt: p.registeredAt.toISOString(),
  }));

  const serializedWinners = winners.map((w) => ({
    ...w,
    drawnAt: w.drawnAt.toISOString(),
  }));

  // Check if registration is still open
  if (event.registrationOpen) {
    return (
      <div className="text-center py-12">
        <Card className="max-w-md mx-auto dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-yellow-600 dark:text-yellow-400">
              Registration Still Open
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              Please close registration before starting the draw.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/admin/events/${eventId}/qr`}>
              <Button>Go to QR Page</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter available participants (not yet drawn)
  const availableParticipants = serializedParticipants.filter(
    (p) => !serializedWinners.some((w) => w.participantId === p.id),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Draw Machine */}
      <div className="lg:col-span-2">
        <DrawMachine
          eventId={eventId}
          event={event}
          participants={serializedParticipants}
          winners={serializedWinners}
          availableParticipants={availableParticipants}
        />
      </div>

      {/* Current Winners */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Winners ({serializedWinners.length})</CardTitle>
          <CardDescription className="dark:text-gray-300">
            {serializedWinners.length > 0
              ? 'Congratulations to our winners!'
              : 'No winners drawn yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WinnersList winners={serializedWinners} />
        </CardContent>
      </Card>

      {/* Remaining Participants */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">
            Remaining Participants ({availableParticipants.length})
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            Participants waiting to be drawn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm dark:text-gray-200"
              >
                #{index + 1} {participant.name}
              </div>
            ))}
            {availableParticipants.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                All participants have been drawn!
                <div className="mt-4">
                  <CloseEventButton eventId={eventId} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function DrawPageHeader({ eventId }: { eventId: string }) {
  const result = await getDrawPageData(eventId);

  if (!result.success) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Draw Event</h1>
              <p className="text-gray-600 dark:text-gray-400">Event not found</p>
            </div>
            <HeaderControls />
          </div>
        </div>
      </div>
    );
  }

  if (!result.data) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Draw Event</h1>
              <p className="text-gray-600 dark:text-gray-400">No event data found</p>
            </div>
            <HeaderControls />
          </div>
        </div>
      </div>
    );
  }

  const { event } = result.data;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div className="mx-auto max-w-6xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {event.name} - Draw
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Draw winners from registered participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderControls />
            <Link href={`/admin/events/${eventId}/qr`}>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back to QR
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DrawPageServer({ eventId }: DrawPageServerProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense
        fallback={
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
            <div className="mx-auto max-w-6xl px-6 py-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        }
      >
        <DrawPageHeader eventId={eventId} />
      </Suspense>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <Suspense
          fallback={
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardContent className="p-8">
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  </CardContent>
                </Card>
              </div>
              {[1, 2].map((i) => (
                <Card key={i} className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[1, 2, 3].map((j) => (
                        <div
                          key={j}
                          className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                        ></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <DrawPageData eventId={eventId} />
        </Suspense>
      </div>
    </div>
  );
}
