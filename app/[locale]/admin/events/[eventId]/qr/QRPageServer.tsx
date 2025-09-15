import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getEventWithParticipants } from '@/lib/actions/qr';
import { HeaderControls } from '@/components/ClientComponents';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { ParticipantsListLive } from './components/ParticipantsListLive';
import { RegistrationToggle } from './components/RegistrationToggle';
import Link from 'next/link';

interface QRPageServerProps {
  eventId: string;
}

async function EventData({ eventId }: { eventId: string }) {
  const result = await getEventWithParticipants(eventId);

  if (!result.success) {
    throw new Error(result.error);
  }

  if (!result.data) {
    throw new Error('No event data found');
  }

  const { event, participants } = result.data;

  // Serialize dates for client components
  const serializedParticipants = participants.map(p => ({
    ...p,
    registeredAt: p.registeredAt.toISOString()
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* QR Code Card */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Registration QR Code</CardTitle>
          <CardDescription className="dark:text-gray-300">
            Scan to register for this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QRCodeDisplay event={event} />
          <div className="mt-6 text-center">
            <RegistrationToggle event={event} />
          </div>
          {!event.registrationOpen && (
            <div className="mt-4 text-center">
              <Link href={`/admin/events/${eventId}/draw`}>
                <Button size="lg">
                  Go to Draw Page
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Registered Participants</CardTitle>
          <CardDescription className="dark:text-gray-300">
            {serializedParticipants.length} participant(s) registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ParticipantsListLive
            eventId={eventId}
            initialParticipants={serializedParticipants}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function EventHeader({ eventId }: { eventId: string }) {
  const result = await getEventWithParticipants(eventId);

  if (!result.success) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Event Not Found</h1>
              <p className="text-gray-600 dark:text-gray-400">The event could not be loaded</p>
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
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">No Data</h1>
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
      <div className="mx-auto max-w-4xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Event QR Code & Registration</p>
          </div>
          <div className="flex items-center gap-2">
            <HeaderControls />
            <Link href="/admin/dashboard">
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QRPageServer({ eventId }: QRPageServerProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="mx-auto max-w-4xl px-6 py-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          </div>
        </div>
      }>
        <EventHeader eventId={eventId} />
      </Suspense>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <Suspense fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map(i => (
              <Card key={i} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        }>
          <EventData eventId={eventId} />
        </Suspense>
      </div>
    </div>
  );
}