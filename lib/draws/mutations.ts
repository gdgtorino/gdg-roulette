'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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

export async function executeDrawWinner(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);
    const winner = await caller.events.drawWinner({ eventId });

    return winner;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

export async function getDrawResults(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
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

export async function validateDrawEligibility(eventId: string) {
  try {
    const ctx = await getAuthenticatedContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }

    const caller = appRouter.createCaller(ctx);

    // Check event exists and is owned by admin
    const event = await caller.events.getById({ eventId });
    if (!event) {
      throw new Error('Event not found');
    }

    // Check registration is closed
    if (event.registrationOpen) {
      throw new Error('Cannot draw winner while registration is open');
    }

    // Check event is not closed
    if (event.closed) {
      throw new Error('Cannot draw winner for closed event');
    }

    // Get participants and winners to check availability
    const participants = await caller.events.getParticipants({ eventId });
    const winners = await caller.events.getWinners({ eventId });

    // Check if there are participants available to draw
    const availableParticipants = participants.filter(
      (p) => !winners.some((w) => w.participantId === p.id),
    );

    if (availableParticipants.length === 0) {
      throw new Error('No participants available to draw');
    }

    return {
      canDraw: true,
      availableParticipants: availableParticipants.length,
      totalParticipants: participants.length,
      totalWinners: winners.length,
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/admin');
    }
    throw error;
  }
}

// Alias for compatibility
export const executeDraw = executeDrawWinner;
