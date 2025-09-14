'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { executeDraw } from '@/lib/draws/mutations';

const executeDrawSchema = z.object({
  eventId: z.string().uuid(),
  winnerCount: z.number().int().positive().max(100),
});

export async function executeDrawAction(formData: FormData) {
  await requireAdmin();

  const rawData = {
    eventId: formData.get('eventId') as string,
    winnerCount: Number(formData.get('winnerCount')),
  };

  const validatedData = executeDrawSchema.parse(rawData);
  const result = await executeDraw(validatedData.eventId, validatedData.winnerCount);

  revalidatePath(`/admin/events/${validatedData.eventId}`);
  revalidatePath(`/events/${validatedData.eventId}`);
  revalidatePath(`/events/${validatedData.eventId}/draw`);
  revalidatePath(`/events/${validatedData.eventId}/results`);

  return {
    success: true,
    winners: result.winners,
    drawId: result.drawId,
  };
}