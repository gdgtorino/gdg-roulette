'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { executeDraw } from '@/lib/draws/mutations';

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date;
}

const executeDrawSchema = z.object({
  eventId: z.string().uuid(),
  winnerCount: z.number().int().positive().max(100),
});

export async function executeDrawAction(
  _prevState: { success: boolean; error?: string; winners?: Winner[]; drawId?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error?: string; winners?: Winner[]; drawId?: string }> {
  try {
    await requireAdmin();

    const rawData = {
      eventId: formData.get('eventId') as string,
      winnerCount: Number(formData.get('winnerCount')),
    };

    const validatedData = executeDrawSchema.parse(rawData);
    const result = await executeDraw(validatedData.eventId);

    revalidatePath(`/admin/events/${validatedData.eventId}`);
    revalidatePath(`/events/${validatedData.eventId}`);
    revalidatePath(`/events/${validatedData.eventId}/draw`);
    revalidatePath(`/events/${validatedData.eventId}/results`);

    return {
      success: true,
      winners: [result],
      drawId: result.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to execute draw' };
  }
}
