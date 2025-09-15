'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { deleteEvent } from '@/lib/actions/events';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Event {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string | Date;
  registrationOpen: boolean;
  qrCode: string;
}

interface EventsListProps {
  title: string;
  description: string;
  events: Event[];
  type: 'current' | 'old';
}

export function EventsList({ title, description, events, type }: EventsListProps) {
  const { t } = useTranslation();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; event: Event | null }>({
    open: false,
    event: null,
  });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const openDeleteDialog = (event: Event) => {
    setDeleteDialog({ open: true, event });
  };

  const confirmDeleteEvent = async () => {
    const event = deleteDialog.event;
    if (!event) return;

    setDeleteDialog({ open: false, event: null });
    setDeletingIds((prev) => new Set([...Array.from(prev), event.id]));

    try {
      const result = await deleteEvent(null, event.id);
      if (!result.success) {
        // Handle error - in a real app you'd show a toast/notification
        console.error('Delete failed:', result.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(event.id);
        return newSet;
      });
    }
  };

  return (
    <>
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">
            {title.startsWith('admin.') ? t(title as keyof typeof t) : title}
          </CardTitle>
          <CardDescription className="dark:text-gray-300">
            {description.startsWith('admin.') ? t(description as keyof typeof t) : description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className={`flex items-center justify-between rounded-lg border dark:border-gray-700 p-4 ${
                  type === 'old' ? 'bg-gray-50 dark:bg-gray-700' : 'dark:bg-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div
                    className={`font-medium ${type === 'old' ? 'text-gray-700 dark:text-gray-200' : 'dark:text-white'}`}
                  >
                    {event.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(event.createdAt).toLocaleString()}
                  </div>
                  {type === 'current' && (
                    <div className="text-sm dark:text-gray-300">
                      Registration:
                      <span
                        className={
                          event.registrationOpen
                            ? 'text-green-600 dark:text-green-400 ml-1'
                            : 'text-red-600 dark:text-red-400 ml-1'
                        }
                      >
                        {event.registrationOpen
                          ? t('admin.registrationOpen')
                          : t('admin.registrationClosed')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {type === 'current' ? (
                    <>
                      <Link href={`/admin/events/${event.id}/qr`}>
                        <Button size="sm" variant="outline">
                          {t('admin.viewQR')}
                        </Button>
                      </Link>
                      {!event.registrationOpen && (
                        <Link href={`/admin/events/${event.id}/draw`}>
                          <Button size="sm">{t('admin.startDraw')}</Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <Link href={`/admin/events/${event.id}/results`}>
                      <Button size="sm" variant="outline">
                        {t('admin.viewResults')}
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteDialog(event)}
                    disabled={deletingIds.has(event.id)}
                  >
                    {deletingIds.has(event.id) ? '...' : t('admin.deleteEvent')}
                  </Button>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {type === 'current'
                  ? 'No current events. Create one to get started!'
                  : 'No previous events'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              {t('admin.deleteEvent')}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Are you sure you want to delete event &quot;{deleteDialog.event?.name}&quot;? This
              will also delete all participants and winners. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEvent}>
              {t('admin.deleteEvent')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
