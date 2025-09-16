'use server';

import { redirect } from 'next/navigation';
import { revalidatePath, unstable_noStore } from 'next/cache';
import { appRouter } from '../trpc/root';
import { verifyToken } from '../utils/auth';
import { redisService } from '../redis';
import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

async function getAuthenticatedContext(): Promise<Context | null> {
  unstable_noStore();
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const admin = verifyToken(token);
    await redisService.connect();

    const mockReq = {
      headers: {
        get: (name: string) => (name === 'authorization' ? `Bearer ${token}` : null),
      },
    } as { headers: { get: (name: string) => string | null } };

    return {
      req: mockReq,
      admin,
    } as unknown as Context;
  } catch {
    return null;
  }
}

export async function getDrawPageData(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);

    // Get event details
    const event = await caller.events.getById({ eventId });

    // Get participants
    const participants = await caller.events.getParticipants({ eventId });

    // Get existing winners
    const winners = await caller.events.getWinners({ eventId });

    return {
      success: true,
      data: {
        event,
        participants,
        winners,
      },
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      if (error.code === 'NOT_FOUND') {
        return { success: false, error: 'Event not found' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch draw data' };
  }
}

export async function drawWinner(
  _prevState: { success: boolean; error?: string; data?: unknown } | null,
  eventId: string,
): Promise<{ success: boolean; error?: string; data?: unknown }> {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const winner = await caller.events.drawWinner({ eventId });

    revalidatePath(`/[locale]/admin/events/${eventId}/draw`);

    return { success: true, data: winner };
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to draw winner' };
  }
}

export async function closeEvent(
  prevState: { success: boolean; error: string } | null,
  eventId: string,
): Promise<{ success: boolean; error: string }> {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    await caller.events.closeEvent({ eventId });

    revalidatePath(`/[locale]/admin/events/${eventId}/draw`);
    redirect(`/admin/events/${eventId}/results`);
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to close event' };
  }
}
