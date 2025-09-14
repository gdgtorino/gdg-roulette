import { PrismaClient, User, Draw, Ticket, Winner, Session } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Database service that replaces Redis functionality with PostgreSQL
 */
class DatabaseService {
  private client: PrismaClient;

  constructor() {
    this.client = prisma;
  }

  async connect() {
    // Prisma client connects automatically on first query
    try {
      await this.client.$queryRaw`SELECT 1`;
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.client.$disconnect();
  }

  // Admin/User operations
  async getAdmin(username: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { username },
    });
  }

  async createAdmin(admin: {
    id: string;
    username: string;
    password: string;
    createdAt: Date;
  }): Promise<void> {
    await this.client.user.create({
      data: {
        id: admin.id,
        username: admin.username,
        password: admin.password,
        role: 'ADMIN',
        createdAt: admin.createdAt,
        updatedAt: admin.createdAt,
      },
    });
  }

  async getAllAdmins(): Promise<User[]> {
    return this.client.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAdmin(username: string): Promise<void> {
    const user = await this.getAdmin(username);
    if (!user) return;

    // Delete user and all related data (cascading)
    await this.client.user.delete({
      where: { id: user.id },
    });
  }

  // Event/Draw operations
  async createEvent(event: {
    id: string;
    name: string;
    createdBy: string;
    createdAt: Date;
    registrationOpen: boolean;
    closed: boolean;
    qrCode: string;
  }): Promise<void> {
    await this.client.draw.create({
      data: {
        id: event.id,
        name: event.name,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
        registrationOpen: event.registrationOpen,
        closed: event.closed,
        qrCode: event.qrCode,
      },
    });
  }

  async getEvent(eventId: string): Promise<Draw | null> {
    return this.client.draw.findUnique({
      where: { id: eventId },
    });
  }

  async getAdminEvents(adminId: string): Promise<Draw[]> {
    return this.client.draw.findMany({
      where: { createdBy: adminId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEventRegistration(eventId: string, open: boolean): Promise<void> {
    await this.client.draw.update({
      where: { id: eventId },
      data: {
        registrationOpen: open,
        updatedAt: new Date(),
      },
    });
  }

  async updateEventClosed(eventId: string, closed: boolean): Promise<void> {
    await this.client.draw.update({
      where: { id: eventId },
      data: {
        closed,
        updatedAt: new Date(),
      },
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    // Cascading delete will handle tickets and winners
    await this.client.draw.delete({
      where: { id: eventId },
    });
  }

  // Participant/Ticket operations
  async addParticipant(participant: {
    id: string;
    eventId: string;
    name: string;
    registeredAt: Date;
  }): Promise<void> {
    await this.client.ticket.create({
      data: {
        id: participant.id,
        drawId: participant.eventId,
        name: participant.name,
        registeredAt: participant.registeredAt,
        updatedAt: participant.registeredAt,
      },
    });
  }

  async getEventParticipants(eventId: string): Promise<Ticket[]> {
    return this.client.ticket.findMany({
      where: { drawId: eventId },
      orderBy: { registeredAt: 'asc' },
    });
  }

  async isParticipantNameTaken(eventId: string, name: string): Promise<boolean> {
    const existing = await this.client.ticket.findFirst({
      where: {
        drawId: eventId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
    return !!existing;
  }

  async removeParticipant(participantId: string): Promise<void> {
    await this.client.ticket.delete({
      where: { id: participantId },
    });
  }

  // Winner operations
  async addWinner(winner: {
    id: string;
    eventId: string;
    participantId: string;
    participantName: string;
    drawOrder: number;
    drawnAt: Date;
  }): Promise<void> {
    await this.client.winner.create({
      data: {
        id: winner.id,
        drawId: winner.eventId,
        ticketId: winner.participantId,
        drawOrder: winner.drawOrder,
        drawnAt: winner.drawnAt,
      },
    });
  }

  async getEventWinners(eventId: string): Promise<(Winner & { ticket: Ticket })[]> {
    return this.client.winner.findMany({
      where: { drawId: eventId },
      include: { ticket: true },
      orderBy: { drawOrder: 'asc' },
    });
  }

  // Session operations for database-based session storage
  async createSession(sessionData: {
    sessionId: string;
    userId: string;
    data: any;
    expiresAt: Date;
  }): Promise<Session> {
    return this.client.session.create({
      data: sessionData,
    });
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.client.session.findUnique({
      where: { sessionId },
    });

    // Check if session is expired
    if (session && session.expiresAt < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  async updateSession(sessionId: string, data: any, expiresAt: Date): Promise<Session> {
    return this.client.session.update({
      where: { sessionId },
      data: {
        data,
        expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.session.delete({
      where: { sessionId },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.client.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  // Cache operations
  async getCache(key: string): Promise<any | null> {
    const cache = await this.client.cache.findUnique({
      where: { key },
    });

    if (!cache) return null;

    // Check if expired
    if (cache.expiresAt && cache.expiresAt < new Date()) {
      await this.client.cache.delete({ where: { key } });
      return null;
    }

    return cache.value;
  }

  async setCache(key: string, value: any, expiresAt?: Date): Promise<void> {
    await this.client.cache.upsert({
      where: { key },
      update: {
        value,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        expiresAt,
      },
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.client.cache.delete({
      where: { key },
    });
  }

  async cleanupExpiredCache(): Promise<number> {
    const result = await this.client.cache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export const databaseService = new DatabaseService();