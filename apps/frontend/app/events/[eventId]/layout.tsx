import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { EventNavigation } from '@/components/events/EventNavigation';
import { getEvent } from '@/lib/events/queries';

interface EventLayoutProps {
  children: ReactNode;
  params: {
    eventId: string;
  };
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const event = await getEvent(params.eventId);

  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <EventNavigation event={event} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}