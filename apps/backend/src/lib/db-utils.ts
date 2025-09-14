import { PrismaClient, EventState, AdminRole } from '@prisma/client';
import { prisma } from './database.js';

// Event Management Utilities
export const eventManager = {
  async create(name: string, createdBy: string, maxParticipants?: number): Promise<{ id: string }> {
    return await prisma.event.create({
      data: {
        name,
        createdBy,
        maxParticipants,
        state: EventState.INIT,
      },
      select: { id: true },
    });
  },

  async updateState(eventId: string, state: EventState): Promise<void> {
    await prisma.event.update({
      where: { id: eventId },
      data: { state },
    });
  },

  async generateRegistrationLink(eventId: string, baseUrl: string): Promise<string> {
    const registrationLink = `${baseUrl}/register/${eventId}`;
    await prisma.event.update({
      where: { id: eventId },
      data: { registrationLink },
    });
    return registrationLink;
  },

  async setQRCode(eventId: string, qrCode: string): Promise<void> {
    await prisma.event.update({
      where: { id: eventId },
      data: { qrCode },
    });
  },

  async getById(eventId: string) {
    return await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        admin: {
          select: { id: true, username: true, permissions: true },
        },
        participants: {
          include: {
            winner: true,
          },
        },
        winners: {
          include: {
            participant: true,
          },
          orderBy: { position: 'asc' },
        },
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
    });
  },

  async getAll(adminId?: string) {
    const where = adminId ? { createdBy: adminId } : {};
    return await prisma.event.findMany({
      where,
      include: {
        admin: {
          select: { id: true, username: true },
        },
        _count: {
          select: {
            participants: true,
            winners: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async delete(eventId: string): Promise<void> {
    await prisma.event.delete({
      where: { id: eventId },
    });
  },
};

// Participant Management Utilities
export const participantManager = {
  async register(eventId: string, name: string, userId?: string) {
    // Check if event is in registration state
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { state: true, maxParticipants: true, _count: { select: { participants: true } } },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.state !== EventState.REGISTRATION) {
      throw new Error('Event is not open for registration');
    }

    if (event.maxParticipants && event._count.participants >= event.maxParticipants) {
      throw new Error('Event is full');
    }

    return await prisma.participant.create({
      data: {
        name,
        eventId,
        userId,
      },
    });
  },

  async getByEvent(eventId: string) {
    return await prisma.participant.findMany({
      where: { eventId },
      include: {
        winner: true,
      },
      orderBy: { registeredAt: 'asc' },
    });
  },

  async unregister(participantId: string): Promise<void> {
    await prisma.participant.delete({
      where: { id: participantId },
    });
  },

  async count(eventId: string): Promise<number> {
    return await prisma.participant.count({
      where: { eventId },
    });
  },
};

// Winner Management Utilities
export const winnerManager = {
  async drawWinners(eventId: string, numWinners: number) {
    return await prisma.$transaction(async (tx) => {
      // Get all participants for the event
      const participants = await tx.participant.findMany({
        where: { eventId },
        select: { id: true },
      });

      if (participants.length === 0) {
        throw new Error('No participants to draw from');
      }

      if (numWinners > participants.length) {
        throw new Error('Cannot draw more winners than participants');
      }

      // Randomly shuffle participants
      const shuffled = participants.sort(() => Math.random() - 0.5);
      const selectedWinners = shuffled.slice(0, numWinners);

      // Create winner records
      const winners = await Promise.all(
        selectedWinners.map((participant, index) =>
          tx.winner.create({
            data: {
              participantId: participant.id,
              eventId,
              position: index + 1,
            },
            include: {
              participant: true,
            },
          })
        )
      );

      // Update event state to DRAW
      await tx.event.update({
        where: { id: eventId },
        data: { state: EventState.DRAW },
      });

      return winners;
    });
  },

  async getByEvent(eventId: string) {
    return await prisma.winner.findMany({
      where: { eventId },
      include: {
        participant: true,
      },
      orderBy: { position: 'asc' },
    });
  },

  async clear(eventId: string): Promise<void> {
    await prisma.winner.deleteMany({
      where: { eventId },
    });
  },
};

// Admin Management Utilities
export const adminManager = {
  async create(username: string, hashedPassword: string, permissions: AdminRole[] = [AdminRole.ADMIN]) {
    return await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        permissions,
      },
      select: {
        id: true,
        username: true,
        permissions: true,
        createdAt: true,
      },
    });
  },

  async findByUsername(username: string) {
    return await prisma.admin.findUnique({
      where: { username },
    });
  },

  async findById(id: string) {
    return await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await prisma.admin.update({
      where: { id },
      data: { password: hashedPassword },
    });
  },

  async updatePermissions(id: string, permissions: AdminRole[]): Promise<void> {
    await prisma.admin.update({
      where: { id },
      data: { permissions },
    });
  },

  async getAll() {
    return await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.admin.delete({
      where: { id },
    });
  },
};

// Migration Utilities
export const migrationManager = {
  async validateSchema(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1 FROM "admins" LIMIT 1`;
      await prisma.$queryRaw`SELECT 1 FROM "events" LIMIT 1`;
      await prisma.$queryRaw`SELECT 1 FROM "participants" LIMIT 1`;
      await prisma.$queryRaw`SELECT 1 FROM "winners" LIMIT 1`;
      await prisma.$queryRaw`SELECT 1 FROM "sessions" LIMIT 1`;
      return true;
    } catch (error) {
      console.error('Schema validation failed:', error);
      return false;
    }
  },

  async resetDatabase(): Promise<void> {
    await prisma.$transaction([
      prisma.winner.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.event.deleteMany(),
      prisma.session.deleteMany(),
      prisma.cache.deleteMany(),
    ]);
  },

  async getStatistics() {
    const [admins, events, participants, winners, sessions] = await Promise.all([
      prisma.admin.count(),
      prisma.event.count(),
      prisma.participant.count(),
      prisma.winner.count(),
      prisma.session.count(),
    ]);

    return {
      admins,
      events,
      participants,
      winners,
      sessions,
    };
  },
};

export default {
  eventManager,
  participantManager,
  winnerManager,
  adminManager,
  migrationManager,
};