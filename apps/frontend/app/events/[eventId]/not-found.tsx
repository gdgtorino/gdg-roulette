import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function EventNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-gray-400 text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Event Not Found
        </h2>
        <p className="text-gray-600 mb-6">
          The event you're looking for doesn't exist or has been removed.
        </p>
        <div className="space-x-4">
          <Link href="/">
            <Button>
              Go Home
            </Button>
          </Link>
          <Link href="/admin/events">
            <Button variant="outline">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}