'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { registerParticipant } from '@/lib/participants/mutations';

const registerSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
});

export async function registerParticipantAction(
  prevState: { success: boolean; error: string } | null,
  formData: FormData
): Promise<{ success: boolean; error: string }> {
  try {
    const rawData = {
      eventId: formData.get('eventId') as string,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    const validatedData = registerSchema.parse(rawData);
    const participant = await registerParticipant(validatedData.eventId, validatedData.name);

    revalidatePath(`/events/${validatedData.eventId}`);
    revalidatePath(`/events/${validatedData.eventId}/participants`);
    revalidatePath(`/admin/events/${validatedData.eventId}`);

    redirect(`/events/${validatedData.eventId}/waiting?participantId=${participant.id}`);
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Registration failed' };
  }
}