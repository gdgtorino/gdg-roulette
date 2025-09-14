import { prisma } from './prisma';
import type { Admin, Event, Participant, Winner } from './types';

class DatabaseService {
  // Admin operations
  async getAdmin(username: string): Promise<Admin | null> {
    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    return admin ? {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      createdAt: admin.createdAt
    } : null;
  }

  async createAdmin(admin: Omit<Admin, 'id'> & { id?: string }): Promise<void> {
    await prisma.admin.create({
      data: {
        id: admin.id,
        username: admin.username,
        password: admin.password,
        createdAt: admin.createdAt
      }
    });
  }

  async getAllAdmins(): Promise<Admin[]> {
    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: 'asc' }
    });

    return admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      password: admin.password,
      createdAt: admin.createdAt
    }));
  }

  async deleteAdmin(username: string): Promise<void> {
    await prisma.admin.delete({
      where: { username }
    });
  }

  // Event operations
  async createEvent(event: Event): Promise<void> {
    await prisma.event.create({
      data: {
        id: event.id,
        name: event.name,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
        registrationOpen: event.registrationOpen,
        closed: event.closed,
        qrCode: event.qrCode
      }
    });
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    return event ? {
      id: event.id,
      name: event.name,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      registrationOpen: event.registrationOpen,
      closed: event.closed,
      qrCode: event.qrCode
    } : null;
  }

  async getAdminEvents(adminId: string): Promise<Event[]> {
    const events = await prisma.event.findMany({
      where: { createdBy: adminId },
      orderBy: { createdAt: 'desc' }
    });

    return events.map(event => ({
      id: event.id,
      name: event.name,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      registrationOpen: event.registrationOpen,
      closed: event.closed,
      qrCode: event.qrCode
    }));
  }

  async updateEventRegistration(eventId: string, open: boolean): Promise<void> {
    await prisma.event.update({
      where: { id: eventId },
      data: { registrationOpen: open }
    });
  }

  async updateEventClosed(eventId: string, closed: boolean): Promise<void> {
    await prisma.event.update({
      where: { id: eventId },
      data: { closed }
    });
  }

  async deleteEvent(eventId: string): Promise<void> {
    await prisma.event.delete({
      where: { id: eventId }
    });
  }

  // Participant operations
  async addParticipant(participant: Participant): Promise<void> {
    await prisma.participant.create({
      data: {
        id: participant.id,
        eventId: participant.eventId,
        name: participant.name,
        registeredAt: participant.registeredAt
      }
    });
  }

  async getEventParticipants(eventId: string): Promise<Participant[]> {
    const participants = await prisma.participant.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' }
    });

    return participants.map(participant => ({
      id: participant.id,
      eventId: participant.eventId,
      name: participant.name,
      registeredAt: participant.registeredAt
    }));
  }

  async isParticipantNameTaken(eventId: string, name: string): Promise<boolean> {
    const participant = await prisma.participant.findFirst({
      where: {
        eventId,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    return !!participant;
  }

  async removeParticipant(participantId: string): Promise<void> {
    await prisma.participant.delete({
      where: { id: participantId }
    });
  }

  // Winner operations
  async addWinner(winner: Winner): Promise<void> {
    await prisma.winner.create({
      data: {
        id: winner.id,
        eventId: winner.eventId,
        participantId: winner.participantId,
        participantName: winner.participantName,
        drawOrder: winner.drawOrder,
        drawnAt: winner.drawnAt
      }
    });
  }

  async getEventWinners(eventId: string): Promise<Winner[]> {
    const winners = await prisma.winner.findMany({
      where: { eventId },
      orderBy: { drawOrder: 'asc' }
    });

    return winners.map(winner => ({
      id: winner.id,
      eventId: winner.eventId,
      participantId: winner.participantId,
      participantName: winner.participantName,
      drawOrder: winner.drawOrder,
      drawnAt: winner.drawnAt
    }));
  }
}

export const databaseService = new DatabaseService();