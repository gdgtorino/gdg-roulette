import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { EventStatus } from '@prisma/client';
import crypto from 'crypto';

// draw one random winner
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    // use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id },
        include: {
          winners: true,
        },
      });

      if (!event) {
        throw new Error('event not found');
      }

      if (event.status !== EventStatus.DRAWING) {
        throw new Error('event must be in DRAWING status');
      }

      // get participants who haven't won yet
      const eligibleParticipants = await tx.participant.findMany({
        where: {
          eventId: id,
          isWinner: false,
        },
      });

      if (eligibleParticipants.length === 0) {
        throw new Error('no eligible participants remaining');
      }

      // use crypto.randomInt for secure random selection
      const randomIndex = crypto.randomInt(0, eligibleParticipants.length);
      const selectedParticipant = eligibleParticipants[randomIndex];

      if (!selectedParticipant) {
        throw new Error('failed to select participant');
      }

      // calculate draw order
      const drawOrder = event.winners.length + 1;

      // mark participant as winner
      await tx.participant.update({
        where: { id: selectedParticipant.id },
        data: { isWinner: true },
      });

      // create winner record
      const winner = await tx.winner.create({
        data: {
          participantId: selectedParticipant.id,
          eventId: id,
          drawOrder,
        },
        include: {
          participant: true,
        },
      });

      return winner;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'unauthorized') {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
      if (
        error.message === 'event not found' ||
        error.message === 'event must be in DRAWING status' ||
        error.message === 'no eligible participants remaining'
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}