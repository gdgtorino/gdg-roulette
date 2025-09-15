import Link from 'next/link';
interface Event {
  id: string;
  name: string;
  description?: string;
  registrationOpen: boolean;
  closed: boolean;
  status: string;
  createdAt: Date;
}
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';

interface EventOverviewProps {
  event: Event;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  registration: 'bg-blue-100 text-blue-800',
  drawing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export async function EventOverview({ event }: EventOverviewProps) {
  const participantCount = 0; // TODO: Implement participant count

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
            <Badge className={statusColors[event.status as keyof typeof statusColors] || statusColors.draft}>
              {event.status}
            </Badge>
          </div>

          {event.description && (
            <p className="text-gray-600 text-lg mb-6">{event.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {participantCount}
              </div>
              <div className="text-sm text-gray-600">Participants</div>
              {(event as unknown as {maxParticipants?: number}).maxParticipants && (
                <div className="text-xs text-gray-500">
                  Max: {(event as unknown as {maxParticipants?: number}).maxParticipants}
                </div>
              )}
            </div>

            {(event as unknown as {prizePool?: number}).prizePool && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${(event as unknown as {prizePool?: number}).prizePool}
                </div>
                <div className="text-sm text-gray-600">Prize Pool</div>
              </div>
            )}

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {event.status === 'completed' ? 'Completed' : 'Live'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>
      </div>

      {event.status === 'registration' && (
        <div className="mt-8 text-center">
          <Link href={`/events/${event.id}/register`}>
            <Button size="lg" className="px-8">
              Join This Draw
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}