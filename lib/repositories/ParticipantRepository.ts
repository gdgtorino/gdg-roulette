import { PrismaClient } from '@prisma/client';
import { Participant } from '../types';

const prisma = new PrismaClient();

export class ParticipantRepository {
  async findById(id: string): Promise<Participant | null> {
    try {
      const participant = await prisma.participant.findUnique({
        where: { id }
      });
      return participant;
    } catch (error) {
      throw new Error(`Failed to find participant by ID: ${error}`);
    }
  }

  async findByEventId(eventId: string): Promise<Participant[]> {
    try {
      const participants = await prisma.participant.findMany({
        where: { eventId },
        orderBy: { registeredAt: 'asc' }
      });
      return participants;
    } catch (error) {
      throw new Error(`Failed to find participants by event ID: ${error}`);
    }
  }

  async findByEventIdAndName(eventId: string, name: string): Promise<Participant | null> {
    try {
      const participant = await prisma.participant.findUnique({
        where: {
          eventId_name: {
            eventId,
            name
          }
        }
      });
      return participant;
    } catch (error) {
      throw new Error(`Failed to find participant by event ID and name: ${error}`);
    }
  }

  async create(participantData: {
    eventId: string;
    name: string;
  }): Promise<Participant> {
    try {
      const participant = await prisma.participant.create({
        data: {
          eventId: participantData.eventId,
          name: participantData.name
        }
      });
      return participant;
    } catch (error) {
      throw new Error(`Failed to create participant: ${error}`);
    }
  }

  async update(id: string, updateData: {
    name?: string;
  }): Promise<Participant> {
    try {
      const participant = await prisma.participant.update({
        where: { id },
        data: updateData
      });
      return participant;
    } catch (error) {
      throw new Error(`Failed to update participant: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.participant.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete participant: ${error}`);
    }
  }

  async getCount(eventId: string): Promise<number> {
    try {
      const count = await prisma.participant.count({
        where: { eventId }
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to get participant count: ${error}`);
    }
  }

  async getAllUndrawn(eventId: string): Promise<Participant[]> {
    try {
      const participants = await prisma.participant.findMany({
        where: {
          eventId,
          Winner: {
            none: {}
          }
        },
        orderBy: { registeredAt: 'asc' }
      });
      return participants;
    } catch (error) {
      throw new Error(`Failed to get undrawn participants: ${error}`);
    }
  }

  async getUndrawenCount(eventId: string): Promise<number> {
    try {
      const count = await prisma.participant.count({
        where: {
          eventId,
          Winner: {
            none: {}
          }
        }
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to get undrawn participant count: ${error}`);
    }
  }

  async deleteAllByEventId(eventId: string): Promise<boolean> {
    try {
      await prisma.participant.deleteMany({
        where: { eventId }
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete participants by event ID: ${error}`);
    }
  }
}