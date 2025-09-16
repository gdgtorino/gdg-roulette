'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { unstable_noStore } from 'next/cache';
import { appRouter } from '../trpc/root';
import { verifyToken } from '../utils/auth';
import { redisService } from '../redis';
import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

async function getAuthenticatedContext(): Promise<Context | null> {
  unstable_noStore();
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const admin = verifyToken(token);
    await redisService.connect();

    // Create mock request for context
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

export async function getEvents() {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const events = await caller.events.getAdminEvents();

    return { success: true, data: events };
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    return { success: false, error: 'Failed to fetch events' };
  }
}

export async function createEvent(
  _prevState: { success: boolean; error: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error: string }> {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const name = formData.get('name') as string;
    if (!name || name.trim().length < 3) {
      return { success: false, error: 'Event name must be at least 3 characters long' };
    }

    const caller = appRouter.createCaller(ctx);
    const event = await caller.events.create({ name: name.trim() });

    revalidatePath('/[locale]/admin/dashboard');
    redirect(`/admin/events/${event.id}/qr`);
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create event' };
  }
}

export async function deleteEvent(
  prevState: { success: boolean; error?: string; message?: string } | null,
  eventId: string,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    await caller.events.delete({ eventId });

    revalidatePath('/[locale]/admin/dashboard');
    return { success: true, message: 'Event deleted successfully' };
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === 'UNAUTHORIZED') {
        redirect('/admin');
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete event' };
  }
}

export async function getCurrentAdmin() {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      return null;
    }

    // Return the admin info from context
    return ctx.admin;
  } catch {
    return null;
  }
}
