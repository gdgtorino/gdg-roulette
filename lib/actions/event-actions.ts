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

export async function createEventAction(
  prevState: { success: boolean; error: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error: string }> {
  try {
    await requireAdmin();

    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      maxParticipants: formData.get('maxParticipants')
        ? Number(formData.get('maxParticipants'))
        : undefined,
      prizePool: formData.get('prizePool') ? Number(formData.get('prizePool')) : undefined,
      scheduledStart: formData.get('scheduledStart') as string,
    };

    const validatedData = createEventSchema.parse(rawData);
    const event = await createEvent(validatedData.name);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/events');
    redirect(`/admin/events/${event.id}`);
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create event' };
  }
}

export async function updateEventAction(
  prevState: { success: boolean; error: string } | null,
  eventId: string,
  formData: FormData,
): Promise<{ success: boolean; error: string }> {
  try {
    await requireAdmin();

    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      maxParticipants: formData.get('maxParticipants')
        ? Number(formData.get('maxParticipants'))
        : undefined,
      prizePool: formData.get('prizePool') ? Number(formData.get('prizePool')) : undefined,
      status: formData.get('status') as 'draft' | 'registration' | 'drawing' | 'completed',
    };

    updateEventSchema.parse(rawData);
    await updateEvent(eventId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);

    return { success: true, error: '' };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update event' };
  }
}

export async function deleteEventAction(
  prevState: { success: boolean; error: string } | null,
  eventId: string,
): Promise<{ success: boolean; error: string }> {
  try {
    await requireAdmin();

    await deleteEvent(eventId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/events');
    redirect('/admin/events');
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete event' };
  }
}

export async function updateEventStatusAction(
  prevState: { success: boolean; error: string } | null,
  eventId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _status: 'draft' | 'registration' | 'drawing' | 'completed',
): Promise<{ success: boolean; error: string }> {
  try {
    await requireAdmin();

    await updateEvent(eventId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);

    return { success: true, error: '' };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update event status' };
  }
}
