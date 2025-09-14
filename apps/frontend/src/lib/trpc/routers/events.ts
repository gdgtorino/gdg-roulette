import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { redisService } from '@/lib/redis';
import { generatePassphrase } from '@/lib/passphrase';
import type { Event, Participant, Winner } from '@/lib/types';

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long')
});

const RegisterParticipantSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1).max(50).optional()
});

export const eventsRouter = router({
  // Get all events for admin (protected)
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return redisService.getAdminEvents(ctx.admin.adminId);
    }),

  // Create new event (protected)
  create: protectedProcedure
    .input(CreateEventSchema)
    .mutation(async ({ input, ctx }) => {
      const eventId = uuidv4();
      const qrData = `${process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL}/register/${eventId}`;
      const qrCode = await QRCode.toDataURL(qrData);

      const event: Event = {
        id: eventId,
        name: input.name,
        createdBy: ctx.admin.adminId,
        createdAt: new Date(),
        registrationOpen: true,
        closed: false,
        qrCode
      };

      await redisService.createEvent(event);
      return event;
    }),

  // Get event details (public)
  getById: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }
      return event;
    }),

  // Delete event (protected)
  delete: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this event'
        });
      }

      await redisService.deleteEvent(input.eventId);
      return { success: true };
    }),

  // Toggle registration (protected)
  toggleRegistration: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to modify this event'
        });
      }

      const newStatus = !event.registrationOpen;
      await redisService.updateEventRegistration(input.eventId, newStatus);

      return { registrationOpen: newStatus };
    }),

  // Close event (protected)
  close: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to close this event'
        });
      }

      await redisService.updateEventClosed(input.eventId, true);
      return { closed: true };
    }),

  // Register participant (public)
  registerParticipant: publicProcedure
    .input(RegisterParticipantSchema)
    .mutation(async ({ input }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (!event.registrationOpen) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Registration is closed for this event'
        });
      }

      const participantName = input.name || generatePassphrase();

      // Check if name is already taken
      const isNameTaken = await redisService.isParticipantNameTaken(input.eventId, participantName);
      if (isNameTaken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Name already taken for this event'
        });
      }

      const participant: Participant = {
        id: uuidv4(),
        eventId: input.eventId,
        name: participantName,
        registeredAt: new Date()
      };

      await redisService.addParticipant(participant);
      return participant;
    }),

  // Get participants (protected)
  getParticipants: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view participants'
        });
      }

      return redisService.getEventParticipants(input.eventId);
    }),

  // Draw winner (protected)
  drawWinner: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to draw for this event'
        });
      }

      if (event.registrationOpen) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Close registration before drawing'
        });
      }

      const participants = await redisService.getEventParticipants(input.eventId);
      const winners = await redisService.getEventWinners(input.eventId);

      const availableParticipants = participants.filter(
        p => !winners.some(w => w.participantId === p.id)
      );

      if (availableParticipants.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No participants available to draw'
        });
      }

      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const selectedParticipant = availableParticipants[randomIndex];

      const winner: Winner = {
        id: uuidv4(),
        eventId: input.eventId,
        participantId: selectedParticipant.id,
        participantName: selectedParticipant.name,
        drawOrder: winners.length + 1,
        drawnAt: new Date()
      };

      await redisService.addWinner(winner);
      return winner;
    }),

  // Get winners (protected)
  getWinners: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (event.createdBy !== ctx.admin.adminId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Not authorized to view winners'
        });
      }

      return redisService.getEventWinners(input.eventId);
    }),

  // Check name availability (public)
  checkNameAvailability: publicProcedure
    .input(z.object({ eventId: z.string(), name: z.string() }))
    .query(async ({ input }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      if (!event.registrationOpen) {
        return {
          available: false,
          reason: 'Registration closed'
        };
      }

      const isNameTaken = await redisService.isParticipantNameTaken(input.eventId, input.name);
      return {
        available: !isNameTaken,
        reason: isNameTaken ? 'Name already taken' : null
      };
    }),

  // Find participant by name (public)
  findParticipant: publicProcedure
    .input(z.object({ eventId: z.string(), name: z.string() }))
    .query(async ({ input }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      const participants = await redisService.getEventParticipants(input.eventId);
      const participant = participants.find(p => p.name.toLowerCase() === input.name.toLowerCase());

      if (participant) {
        return {
          found: true,
          participantId: participant.id,
          name: participant.name
        };
      } else {
        return { found: false };
      }
    }),

  // Check if participant is winner (public)
  checkWinner: publicProcedure
    .input(z.object({ eventId: z.string(), participantId: z.string() }))
    .query(async ({ input }) => {
      const event = await redisService.getEvent(input.eventId);
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        });
      }

      const winners = await redisService.getEventWinners(input.eventId);
      const winner = winners.find(w => w.participantId === input.participantId);

      if (winner) {
        return winner;
      } else {
        return { isWinner: false };
      }
    })
});