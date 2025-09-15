import Link from 'next/link';
interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
  closed: boolean;
  status: string;
}
import { Badge } from '@/components/ui/Badge';

interface EventNavigationProps {
  event: Event;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  registration: 'bg-blue-100 text-blue-800',
  drawing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export function EventNavigation({ event }: EventNavigationProps) {
  return (
    <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-lg font-bold text-gray-900">
              The Draw
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-lg font-semibold text-gray-700">
              {event.name}
            </span>
            <Badge className={statusColors[event.status as keyof typeof statusColors] || statusColors.draft}>
              {event.status}
            </Badge>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href={`/events/${event.id}`}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Overview
            </Link>
            {event.status === 'registration' && (
              <Link
                href={`/events/${event.id}/register`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Register
              </Link>
            )}
            <Link
              href={`/events/${event.id}/participants`}
              className="text-gray-700 hover:text-gray-900 font-medium"
            >
              Participants
            </Link>
            {(event.status === 'drawing' || event.status === 'completed') && (
              <Link
                href={`/events/${event.id}/results`}
                className="text-green-600 hover:text-green-800 font-medium"
              >
                Results
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}