'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { createEvent, updateEvent, deleteEvent } from '@/lib/events/mutations';

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional(),
  prizePool: z.number().positive().optional(),
  scheduledStart: z.string().datetime().optional(),
});

const updateEventSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional(),
  prizePool: z.number().positive().optional(),
  status: z.enum(['draft', 'registration', 'drawing', 'completed']).optional(),
});

export async function createEventAction(formData: FormData) {
  await requireAdmin();

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    maxParticipants: formData.get('maxParticipants') ? Number(formData.get('maxParticipants')) : undefined,
    prizePool: formData.get('prizePool') ? Number(formData.get('prizePool')) : undefined,
    scheduledStart: formData.get('scheduledStart') as string,
  };

  const validatedData = createEventSchema.parse(rawData);
  const event = await createEvent(validatedData);

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/events');
  redirect(`/admin/events/${event.id}`);
}

export async function updateEventAction(eventId: string, formData: FormData) {
  await requireAdmin();

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    maxParticipants: formData.get('maxParticipants') ? Number(formData.get('maxParticipants')) : undefined,
    prizePool: formData.get('prizePool') ? Number(formData.get('prizePool')) : undefined,
    status: formData.get('status') as 'draft' | 'registration' | 'drawing' | 'completed',
  };

  const validatedData = updateEventSchema.parse(rawData);
  await updateEvent(eventId, validatedData);

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteEventAction(eventId: string) {
  await requireAdmin();

  await deleteEvent(eventId);

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/events');
  redirect('/admin/events');
}

export async function updateEventStatusAction(eventId: string, status: 'draft' | 'registration' | 'drawing' | 'completed') {
  await requireAdmin();

  await updateEvent(eventId, { status });

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
}