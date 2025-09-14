import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getActiveEvents } from '@/lib/events/queries';

async function ActiveEventsList() {
  const events = await getActiveEvents();

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No active events at the moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {event.name}
          </h3>
          {event.description && (
            <p className="text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
            <span>Participants: {event._count?.participants || 0}</span>
            {event.prizePool && <span>Prize: ${event.prizePool}</span>}
          </div>
          <Link href={`/events/${event.id}`}>
            <Button className="w-full">
              {event.status === 'registration' ? 'Join Draw' : 'View Event'}
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to The Draw
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join exciting lottery draws and win amazing prizes.
            Register for events and experience the thrill of winning!
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Active Events
          </h2>
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveEventsList />
          </Suspense>
        </div>

        <div className="text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to participate?
            </h3>
            <p className="text-gray-600 mb-6">
              Browse all available events and join the ones that interest you.
            </p>
            <div className="space-y-4">
              <Link href="/register">
                <Button size="lg" className="w-full">
                  Quick Register
                </Button>
              </Link>
              <Link href="/results">
                <Button variant="outline" size="lg" className="w-full">
                  View Results
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}