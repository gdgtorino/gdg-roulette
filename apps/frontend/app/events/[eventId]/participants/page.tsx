import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventParticipantsList } from '@/components/events/EventParticipantsList';
import { ParticipantStats } from '@/components/events/ParticipantStats';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent } from '@/lib/events/queries';

interface EventParticipantsPageProps {
  params: {
    eventId: string;
  };
}

export async function generateMetadata({ params }: EventParticipantsPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    return {
      title: 'Event Not Found - The Draw',
    };
  }

  return {
    title: `${event.name} Participants - The Draw`,
    description: `View participants for ${event.name}`,
  };
}

export default async function EventParticipantsPage({ params }: EventParticipantsPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{event.name} Participants</h1>
        <p className="text-gray-600 mt-2">Current registered participants</p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <ParticipantStats eventId={params.eventId} />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <EventParticipantsList eventId={params.eventId} />
      </Suspense>
    </div>
  );
}