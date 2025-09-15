'use server';

import { appRouter } from '../trpc/root';
import type { Context } from '../trpc/context';

export async function registerParticipant(eventId: string, name?: string) {
  try {
    // This is a public endpoint, so no auth context needed
    const caller = appRouter.createCaller({} as Context);
    const participant = await caller.events.registerParticipant({
      eventId,
      name
    });

    return participant;
  } catch (error) {
    throw error;
  }
}

export async function checkParticipantExists(eventId: string, name: string) {
  try {
    const caller = appRouter.createCaller({} as Context);
    const result = await caller.events.findParticipant({ eventId, name });

    return result;
  } catch (error) {
    throw error;
  }
}

export async function checkNameAvailability(eventId: string, name: string) {
  try {
    const caller = appRouter.createCaller({} as Context);
    const result = await caller.events.checkNameAvailability({ eventId, name });

    return result;
  } catch (error) {
    throw error;
  }
}

export async function getParticipantStatus(eventId: string, participantId: string) {
  try {
    const caller = appRouter.createCaller({} as Context);

    // Get participant details
    const participant = await caller.events.getParticipant({ eventId, participantId });

    // Check if participant is a winner
    const winnerResult = await caller.events.checkWinner({ eventId, participantId });

    return {
      participant,
      isWinner: 'isWinner' in winnerResult ? winnerResult.isWinner !== false : true,
      winnerDetails: 'isWinner' in winnerResult ? null : winnerResult
    };
  } catch (error) {
    throw error;
  }
}