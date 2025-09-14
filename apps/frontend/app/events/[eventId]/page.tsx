import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventOverview } from '@/components/events/EventOverview';
import { EventActions } from '@/components/events/EventActions';
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
    title: `${event.name} - The Draw`,
    description: event.description,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Suspense fallback={<LoadingSpinner />}>
        <EventOverview event={event} />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <EventActions event={event} />
      </Suspense>
    </div>
  );
}