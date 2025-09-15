import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventDetails } from '@/components/admin/EventDetails';
import { ParticipantList } from '@/components/admin/ParticipantList';
import { EventControls } from '@/components/admin/EventControls';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent, getEventParticipants, getEventWinners } from '@/lib/events/queries';

interface EventPageProps {
  params: {
    eventId: string;
  };
}

export async function generateMetadata({ params }: EventPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    return {
      title: 'Event Not Found - The Draw',
    };
  }

  return {
    title: `${event.name} - Event Management`,
    description: `Manage ${event.name} lottery event`,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const [event, participants, winners] = await Promise.all([
    getEvent(params.eventId),
    getEventParticipants(params.eventId).catch(() => []),
    getEventWinners(params.eventId).catch(() => [])
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-gray-600 mt-2">{event.description}</p>
        </div>
        <EventControls
          event={event}
          participants={participants}
          winners={winners}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingSpinner />}>
            <ParticipantList
              participants={participants}
              winners={winners}
              eventId={params.eventId}
            />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <EventDetails
              event={event}
              participants={participants}
              winners={winners}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}