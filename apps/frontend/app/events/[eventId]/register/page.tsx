import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EventRegistrationForm } from '@/components/events/EventRegistrationForm';
import { EventInfo } from '@/components/events/EventInfo';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent } from '@/lib/events/queries';

interface EventRegisterPageProps {
  params: {
    eventId: string;
  };
}

export async function generateMetadata({ params }: EventRegisterPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    return {
      title: 'Event Not Found - The Draw',
    };
  }

  return {
    title: `Register for ${event.name} - The Draw`,
    description: `Register to participate in ${event.name}`,
  };
}

export default async function EventRegisterPage({ params }: EventRegisterPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Register for {event.name}</h1>
        <p className="text-gray-600 mt-2">Join this lottery draw</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <EventRegistrationForm event={event} />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <EventInfo event={event} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}