import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DrawInterface } from '@/components/events/DrawInterface';
import { DrawStatus } from '@/components/events/DrawStatus';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getEvent } from '@/lib/events/queries';

interface EventDrawPageProps {
  params: {
    eventId: string;
  };
}

export async function generateMetadata({ params }: EventDrawPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    return {
      title: 'Event Not Found - The Draw',
    };
  }

  return {
    title: `${event.name} Draw - The Draw`,
    description: `Live lottery draw for ${event.name}`,
  };
}

export default async function EventDrawPage({ params }: EventDrawPageProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">{event.name} Draw</h1>
        <p className="text-gray-600 mt-2">Live lottery drawing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Suspense fallback={<LoadingSpinner />}>
            <DrawInterface event={event} />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <DrawStatus event={event} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}