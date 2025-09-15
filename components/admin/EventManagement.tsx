import { Suspense } from 'react';
import { getEvents } from '@/lib/events/queries';
import { CreateEventButton } from '@/components/admin/CreateEventButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export async function EventManagement() {
  const events = await getEvents();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Events</h2>
          <p className="text-gray-600 mt-1">Create and manage lottery events</p>
        </div>
        <CreateEventButton />
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <div className="bg-white rounded-lg shadow">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to get started</p>
              <CreateEventButton />
            </div>
          ) : (
            <div className="space-y-4 p-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {event.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.status === 'completed'
                            ? 'bg-gray-100 text-gray-800'
                            : event.status === 'registration'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>Participants: {event._count?.participants || 0}</span>
                      <span>Winners: {event._count?.winners || 0}</span>
                      <span>Created: {new Date(event.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/admin/events/${event.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Manage
                    </a>
                    <a
                      href={`/events/${event.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Suspense>
    </div>
  );
}