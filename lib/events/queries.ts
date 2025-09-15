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

    // Transform events to include count info
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        try {
          const participants = await caller.events.getParticipants({ eventId: event.id });
          const winners = await caller.events.getWinners({ eventId: event.id });

          return {
            ...event,
            _count: {
              participants: participants.length,
              winners: winners.length,
            },
            status: event.closed
              ? ('completed' as const)
              : event.registrationOpen
                ? ('registration' as const)
                : ('drawing' as const),
          };
        } catch {
          // If we can't get counts, return event with zero counts
          return {
            ...event,
            _count: {
              participants: 0,
              winners: 0,
            },
            status: event.closed
              ? ('completed' as const)
              : event.registrationOpen
                ? ('registration' as const)
                : ('drawing' as const),
          };
        }
      }),
    );

    return eventsWithCounts;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export async function getEventById(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const event = await caller.events.getById({ eventId });

    return event;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function getEventParticipants(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const participants = await caller.events.getParticipants({ eventId });

    return participants;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function getEventWinners(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      redirect('/admin');
    }

    const caller = appRouter.createCaller(ctx);
    const winners = await caller.events.getWinners({ eventId });

    return winners;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

// Alias for compatibility
export const getEvent = getEventById;

export async function getActiveEvents() {
  const events = await getEvents();
  return events.filter((event) => !event.closed && event.registrationOpen);
}

export async function getEventStats(eventId?: string) {
  if (eventId) {
    try {
      const event = await getEventById(eventId);
      const participants = await getEventParticipants(eventId);
      const winners = await getEventWinners(eventId);

      return {
        totalParticipants: participants.length,
        totalWinners: winners.length,
        registrationOpen: event.registrationOpen,
        eventClosed: event.closed,
      };
    } catch {
      return {
        totalParticipants: 0,
        totalWinners: 0,
        registrationOpen: false,
        eventClosed: true,
      };
    }
  }

  // Get stats for all events
  const events = await getEvents();
  const totalEvents = events.length;
  const activeEvents = events.filter((e) => !e.closed).length;
  const totalParticipants = events.reduce((sum, e) => sum + (e._count?.participants || 0), 0);
  const totalWinners = events.reduce((sum, e) => sum + (e._count?.winners || 0), 0);

  return {
    totalEvents,
    activeEvents,
    totalParticipants,
    totalWinners,
  };
}
