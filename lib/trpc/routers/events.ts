import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { router, publicProcedure, protectedProcedure } from '../server';
import { redisService } from '../../redis';
import { generatePassphrase } from '../../utils/passphrase';
import type { Event, Participant, Winner } from '../../types';
import { sse } from '../../sse';

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long'),
});

export const eventsRouter = router({
  // Get all events for admin
  getAdminEvents: protectedProcedure.query(async ({ ctx }) => {
    return await redisService.getAdminEvents(ctx.admin.adminId);
  }),

  // Create new event
  create: protectedProcedure.input(CreateEventSchema).mutation(async ({ input, ctx }) => {
    const { name } = input;

    const eventId = uuidv4();
    const qrData = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/register/${eventId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const event: Event = {
      id: eventId,
      name,
      createdBy: ctx.admin.adminId,
      createdAt: new Date(),
      registrationOpen: true,
      closed: false,
      qrCode,
    };

    await redisService.createEvent(event);
    return event;
  }),

  // Get event details (public)
  getById: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input }) => {
    const event = await redisService.getEvent(input.eventId);
    if (!event) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }
    return event;
  }),

  // Delete event
  delete: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this event',
        });
      }

      await redisService.deleteEvent(input.eventId);
      return { message: 'Event deleted successfully' };
    }),

  // Toggle event registration
  toggleRegistration: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to modify this event',
        });
      }

      const newStatus = !event.registrationOpen;
      await redisService.updateEventRegistration(input.eventId, newStatus);

      // Send SSE update
      sse.send(input.eventId, {
        type: 'registrationToggled',
        data: { registrationOpen: newStatus },
        eventId: input.eventId,
      });

      return { registrationOpen: newStatus };
    }),

  // Close event
  closeEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to close this event',
        });
      }

      await redisService.updateEventClosed(input.eventId, true);

      // Send SSE update
      sse.send(input.eventId, {
        type: 'eventClosed',
        data: { closed: true },
        eventId: input.eventId,
      });

      return { closed: true };
    }),

  // Get event participants
  getParticipants: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view participants',
        });
      }

      return await redisService.getEventParticipants(input.eventId);
    }),

  // Get participant details (public)
  getParticipant: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        participantId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { eventId, participantId } = input;

      const event = await redisService.getEvent(eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      const participants = await redisService.getEventParticipants(eventId);
      const participant = participants.find((p) => p.id === participantId);

      if (!participant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Participant not found',
        });
      }

      // Return only safe participant data
      return {
        id: participant.id,
        name: participant.name,
        eventId: participant.eventId,
        registeredAt: participant.registeredAt,
      };
    }),

  // Check if participant is winner (public)
  checkWinner: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        participantId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { eventId, participantId } = input;

      const event = await redisService.getEvent(eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      const winners = await redisService.getEventWinners(eventId);
      const winner = winners.find((w) => w.participantId === participantId);

      if (winner) {
        return winner;
      } else {
        return { isWinner: false };
      }
    }),

  // Check if name is available (public)
  checkNameAvailability: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { eventId, name } = input;

      const event = await redisService.getEvent(eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (!event.registrationOpen) {
        return { available: false, reason: 'Registration closed' };
      }

      const isNameTaken = await redisService.isParticipantNameTaken(eventId, name);

      return {
        available: !isNameTaken,
        reason: isNameTaken ? 'Name already taken' : null,
      };
    }),

  // Find participant by name (public)
  findParticipant: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { eventId, name } = input;

      const event = await redisService.getEvent(eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      const participants = await redisService.getEventParticipants(eventId);
      const participant = participants.find((p) => p.name.toLowerCase() === name.toLowerCase());

      if (participant) {
        return {
          found: true,
          participantId: participant.id,
          name: participant.name,
        };
      } else {
        return { found: false };
      }
    }),

  // Register participant (public)
  registerParticipant: publicProcedure
    .input(
      z.object({
        eventId: z.string(),
        name: z.string().min(1).max(50).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { eventId } = input;

      const event = await redisService.getEvent(eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (!event.registrationOpen) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Registration is closed for this event',
        });
      }

      const participantName = input.name || generatePassphrase();

      // Check if name is already taken
      const isNameTaken = await redisService.isParticipantNameTaken(eventId, participantName);
      if (isNameTaken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Name already taken for this event',
        });
      }

      const participant: Participant = {
        id: uuidv4(),
        eventId,
        name: participantName,
        registeredAt: new Date(),
      };

      await redisService.addParticipant(participant);

      // Send SSE update
      sse.send(eventId, {
        type: 'participantRegistered',
        data: participant,
        eventId,
      });

      return participant;
    }),

  // Draw winner
  drawWinner: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to draw for this event',
        });
      }

      if (event.registrationOpen) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Close registration before drawing',
        });
      }

      const participants = await redisService.getEventParticipants(input.eventId);
      const winners = await redisService.getEventWinners(input.eventId);

      // Filter out already drawn participants
      const availableParticipants = participants.filter(
        (p) => !winners.some((w) => w.participantId === p.id),
      );

      if (availableParticipants.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No participants available to draw',
        });
      }

      // Random selection
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const selectedParticipant = availableParticipants[randomIndex];

      const winner: Winner = {
        id: uuidv4(),
        eventId: input.eventId,
        participantId: selectedParticipant.id,
        participantName: selectedParticipant.name,
        drawOrder: winners.length + 1,
        drawnAt: new Date(),
      };

      await redisService.addWinner(winner);

      // Send SSE update
      sse.send(input.eventId, {
        type: 'winnerDrawn',
        data: winner,
        eventId: input.eventId,
      });

      return winner;
    }),

  // Get event winners
  getWinners: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found',
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view winners',
        });
      }

      return await redisService.getEventWinners(input.eventId);
    }),
});
