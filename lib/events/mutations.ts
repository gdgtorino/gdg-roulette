'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { appRouter } from '../trpc/root';
import { verifyToken } from '../utils/auth';
import { redisService } from '../redis';
import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc/context';

async function getAuthenticatedContext(): Promise<Context | null> {
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
        get: (name: string) => name === 'authorization' ? `Bearer ${token}` : null,
      },
    } as { headers: { get: (name: string) => string | null } };

    return {
      req: mockReq,
      admin
    } as unknown as Context;
  } catch {
    return null;
  }
}

export async function updateEvent(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);

    // For now, we only support updating the name via the existing create method
    // In a full implementation, you would add an update mutation to the TRPC router
    const event = await caller.events.getById({ eventId });

    if (!event) {
      throw new Error('Event not found');
    }

    // Since we don't have an update mutation, we'll return the event as-is
    // In practice, you would implement an update mutation in the TRPC events router
    return event;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function toggleEventRegistration(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.toggleRegistration({ eventId });

    return result;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function closeEvent(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);
    const result = await caller.events.closeEvent({ eventId });

    return result;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function registerParticipant(eventId: string, name?: string) {
  try {
    const caller = appRouter.createCaller({} as Context); // Public endpoint
    const participant = await caller.events.registerParticipant({
      eventId,
      name
    });

    return participant;
  } catch (error) {
    throw error;
  }
}

export async function createEvent(name: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);
    const event = await caller.events.create({ name });

    return event;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);
    await caller.events.delete({ eventId });

    return { success: true, message: 'Event deleted successfully' };
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

// Re-export getEvents from queries for compatibility
export async function getEvents() {
  const { getEvents: getEventsQuery } = await import('./queries');
  return getEventsQuery();
}

// Re-export getEvent from queries for compatibility
export async function getEvent(eventId: string) {
  const { getEventById } = await import('./queries');
  return getEventById(eventId);
}