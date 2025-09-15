import { Suspense } from 'react';
import { EventManagement } from '@/components/admin/EventManagement';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Event Management - The Draw',
  description: 'Create and manage lottery events',
};

export default function EventsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>

      <Suspense fallback={<LoadingSpinner />}>
        <EventManagement />
      </Suspense>
    </div>
  );
}
