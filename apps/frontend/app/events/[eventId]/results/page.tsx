import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventResults } from '@/components/events/EventResults';
import { WinnersDisplay } from '@/components/events/WinnersDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent } from '@/lib/events/queries';

interface EventResultsPageProps {
  params: {
    eventId: string;
  };
}

export async function generateMetadata({ params }: EventResultsPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    return {
      title: 'Event Not Found - The Draw',
    };
  }

  return {
    title: `${event.name} Results - The Draw`,
    description: `Results and winners for ${event.name}`,
  };
}

export default async function EventResultsPage({ params }: EventResultsPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{event.name} Results</h1>
        <p className="text-gray-600 mt-2">Final results and winners</p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <EventResults event={event} />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <WinnersDisplay eventId={params.eventId} />
      </Suspense>
    </div>
  );
}