import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventDetails } from '@/components/admin/EventDetails';
import { ParticipantList } from '@/components/admin/ParticipantList';
import { EventControls } from '@/components/admin/EventControls';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent } from '@/lib/events/queries';

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
  const event = await getEvent(params.eventId);

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
        <EventControls event={event} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Suspense fallback={<LoadingSpinner />}>
            <ParticipantList eventId={params.eventId} />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <EventDetails event={event} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}