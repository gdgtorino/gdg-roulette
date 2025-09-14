import { Suspense } from 'react';
import { EventList } from '@/components/admin/EventList';
import { EventStats } from '@/components/admin/EventStats';
import { CreateEventButton } from '@/components/admin/CreateEventButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Admin Dashboard - The Draw',
  description: 'Manage events and lottery draws',
};

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <CreateEventButton />
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <EventStats />
      </Suspense>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Events</h2>
        </div>
        <Suspense fallback={<LoadingSpinner />}>
          <EventList />
        </Suspense>
      </div>
    </div>
  );
}