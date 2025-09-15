import { PrismaClient } from '@prisma/client';
import { Event } from '../types';

const prisma = new PrismaClient();

export class EventRepository {
  async findById(id: string): Promise<Event | null> {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          participants: true,
          winners: true,
        },
      });
      return event;
    } catch (error) {
      throw new Error(`Failed to find event by ID: ${error}`);
    }
  }

  async create(eventData: {
    name: string;
    description?: string;
    createdBy: string;
    state?: string;
    registrationOpen?: boolean;
    closed?: boolean;
    qrCode?: string;
  }): Promise<Event> {
    try {
      const event = await prisma.event.create({
        data: {
          name: eventData.name,
          createdBy: eventData.createdBy,
          registrationOpen: eventData.registrationOpen ?? true,
          closed: eventData.closed ?? false,
          qrCode: eventData.qrCode ?? '',
        },
        include: {
          participants: true,
          winners: true,
        },
      });
      return event;
    } catch (error) {
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      description?: string;
      state?: string;
      registrationOpen?: boolean;
      closed?: boolean;
      qrCode?: string;
    },
  ): Promise<Event> {
    try {
      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.registrationOpen !== undefined && {
            registrationOpen: updateData.registrationOpen,
          }),
          ...(updateData.closed !== undefined && { closed: updateData.closed }),
          ...(updateData.qrCode && { qrCode: updateData.qrCode }),
        },
        include: {
          participants: true,
          winners: true,
        },
      });
      return event;
    } catch (error) {
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.event.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  async findByAdminId(adminId: string): Promise<Event[]> {
    try {
      const events = await prisma.event.findMany({
        where: { createdBy: adminId },
        include: {
          participants: true,
          winners: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return events;
    } catch (error) {
      throw new Error(`Failed to find events by admin ID: ${error}`);
    }
  }

  async getAll(): Promise<Event[]> {
    try {
      const events = await prisma.event.findMany({
        include: {
          participants: true,
          winners: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return events;
    } catch (error) {
      throw new Error(`Failed to get all events: ${error}`);
    }
  }

  async findActiveEvents(): Promise<Event[]> {
    try {
      const events = await prisma.event.findMany({
        where: {
          closed: false,
        },
        include: {
          participants: true,
          winners: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return events;
    } catch (error) {
      throw new Error(`Failed to find active events: ${error}`);
    }
  }

  async updateQRCode(id: string, qrCode: string): Promise<Event> {
    try {
      const event = await prisma.event.update({
        where: { id },
        data: { qrCode },
        include: {
          participants: true,
          winners: true,
        },
      });
      return event;
    } catch (error) {
      throw new Error(`Failed to update QR code: ${error}`);
    }
  }
}
