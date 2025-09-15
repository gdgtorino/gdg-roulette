import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEvents, getCurrentAdmin } from '@/lib/actions/events';
import { HeaderControls } from '@/components/ClientComponents';
import { CreateEventForm } from './components/CreateEventForm';
import { EventsList } from './components/EventsList';
import { LogoutButton } from './components/LogoutButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function EventsData() {
  const eventsResult = await getEvents();

  if (!eventsResult.success) {
    throw new Error(eventsResult.error);
  }

  const events = eventsResult.data;

  if (!events) {
    throw new Error('No events data received');
  }

  // Separate events into current and old
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const currentEvents = events.filter((event) => new Date(event.createdAt) > dayAgo);

  const oldEvents = events.filter((event) => new Date(event.createdAt) <= dayAgo);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EventsList
        title="admin.events"
        description="admin.registrationOpen"
        events={currentEvents}
        type="current"
      />
      <EventsList
        title="Previous Events"
        description="Events older than 24 hours"
        events={oldEvents}
        type="old"
      />
    </div>
  );
}

async function AdminHeader() {
  const admin = await getCurrentAdmin();
  const t = await getTranslations();

  if (!admin) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('admin.title')} - {t('admin.dashboard')}
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {t('lottery.welcome')}, {admin.username}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <HeaderControls />
            <Link href="/admin/manage">
              <Button variant="outline">{t('admin.manageAdmins')}</Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardServer() {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense
        fallback={
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
            <div className="mx-auto max-w-7xl px-6 py-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            </div>
          </div>
        }
      >
        <AdminHeader />
      </Suspense>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Create Event Card */}
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">{t('admin.createEvent')}</CardTitle>
            <CardDescription className="dark:text-gray-300">
              {t('lottery.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateEventForm />
          </CardContent>
        </Card>

        <Suspense
          fallback={
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                      ></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"
                      ></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          }
        >
          <EventsData />
        </Suspense>
      </div>
    </div>
  );
}
