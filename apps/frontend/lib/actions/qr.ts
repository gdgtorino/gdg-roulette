'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { appRouter } from '../trpc/root';
import { verifyToken } from '../utils/auth';
import { redisService } from '../redis';
import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

async function getAuthenticatedContext(): Promise<Context | null> {
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
        get: (name: string) => name === 'authorization' ? `Bearer ${token}` : null,
      },
    } as any;

    return {
      req: mockReq,
      admin
    };
  } catch {
    return null;
  }
}

export async function getEventWithParticipants(eventId: string) {
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

    return {
      success: true,
      data: {
        event,
        participants
      }
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
    return { success: false, error: 'Failed to fetch event data' };
  }
}

export async function toggleEventRegistration(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.toggleRegistration({ eventId });

    revalidatePath(`/[locale]/admin/events/${eventId}/qr`);

    // If registration was closed, redirect to draw page
    if (!result.registrationOpen) {
      redirect(`/admin/events/${eventId}/draw`);
    }

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to toggle registration' };
  }
}