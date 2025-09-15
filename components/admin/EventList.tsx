import Link from 'next/link';
import { getEvents } from '@/lib/events/queries';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  registration: 'bg-blue-100 text-blue-800',
  drawing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export async function EventList() {
  const events = await getEvents();

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No events found</p>
        <Link href="/admin/events/new">
          <Button className="mt-4">Create Your First Event</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="space-y-4 p-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                <Badge className={statusColors[event.status]}>{event.status}</Badge>
              </div>
              {event.description && <p className="text-gray-600 mt-1">{event.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Participants: {event._count?.participants || 0}</span>
                {(event as unknown as { maxParticipants?: number }).maxParticipants && (
                  <span>
                    Max: {(event as unknown as { maxParticipants?: number }).maxParticipants}
                  </span>
                )}
                {(event as unknown as { prizePool?: number }).prizePool && (
                  <span>Prize: ${(event as unknown as { prizePool?: number }).prizePool}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/events/${event.id}`}>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </Link>
              <Link href={`/events/${event.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
