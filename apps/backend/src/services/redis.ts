import { createClient } from 'redis';
import type { Admin, Event, Participant, Winner } from '../types';

class RedisService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  // Admin operations
  async getAdmin(username: string): Promise<Admin | null> {
    const admin = await this.client.hGetAll(`admin:${username}`);
    if (!admin.id) return null;
    
    return {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      createdAt: new Date(admin.createdAt)
    };
  }

  async createAdmin(admin: Admin): Promise<void> {
    await this.client.hSet(`admin:${admin.username}`, {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      createdAt: admin.createdAt.toISOString()
    });
  }

  // Event operations
  async createEvent(event: Event): Promise<void> {
    await this.client.hSet(`event:${event.id}`, {
      id: event.id,
      name: event.name,
      createdBy: event.createdBy,
      createdAt: event.createdAt.toISOString(),
      registrationOpen: event.registrationOpen.toString(),
      qrCode: event.qrCode
    });
    
    // Add to admin's events list
    await this.client.sAdd(`admin:${event.createdBy}:events`, event.id);
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const event = await this.client.hGetAll(`event:${eventId}`);
    if (!event.id) return null;
    
    return {
      id: event.id,
      name: event.name,
      createdBy: event.createdBy,
      createdAt: new Date(event.createdAt),
      registrationOpen: event.registrationOpen === 'true',
      qrCode: event.qrCode
    };
  }

  async getAdminEvents(adminId: string): Promise<Event[]> {
    const eventIds = await this.client.sMembers(`admin:${adminId}:events`);
    const events: Event[] = [];
    
    for (const eventId of eventIds) {
      const event = await this.getEvent(eventId);
      if (event) events.push(event);
    }
    
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateEventRegistration(eventId: string, open: boolean): Promise<void> {
    await this.client.hSet(`event:${eventId}`, 'registrationOpen', open.toString());
  }

  async deleteEvent(eventId: string): Promise<void> {
    const event = await this.getEvent(eventId);
    if (!event) return;
    
    // Remove from admin's events
    await this.client.sRem(`admin:${event.createdBy}:events`, eventId);
    
    // Delete participants and winners
    const participantIds = await this.client.sMembers(`event:${eventId}:participants`);
    for (const participantId of participantIds) {
      await this.client.del(`participant:${participantId}`);
    }
    
    const winnerIds = await this.client.sMembers(`event:${eventId}:winners`);
    for (const winnerId of winnerIds) {
      await this.client.del(`winner:${winnerId}`);
    }
    
    await this.client.del(`event:${eventId}:participants`);
    await this.client.del(`event:${eventId}:winners`);
    await this.client.del(`event:${eventId}`);
  }

  // Participant operations
  async addParticipant(participant: Participant): Promise<void> {
    await this.client.hSet(`participant:${participant.id}`, {
      id: participant.id,
      eventId: participant.eventId,
      name: participant.name,
      registeredAt: participant.registeredAt.toISOString()
    });
    
    await this.client.sAdd(`event:${participant.eventId}:participants`, participant.id);
  }

  async getEventParticipants(eventId: string): Promise<Participant[]> {
    const participantIds = await this.client.sMembers(`event:${eventId}:participants`);
    const participants: Participant[] = [];
    
    for (const participantId of participantIds) {
      const participant = await this.client.hGetAll(`participant:${participantId}`);
      if (participant.id) {
        participants.push({
          id: participant.id,
          eventId: participant.eventId,
          name: participant.name,
          registeredAt: new Date(participant.registeredAt)
        });
      }
    }
    
    return participants.sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
  }

  async isParticipantNameTaken(eventId: string, name: string): Promise<boolean> {
    const participants = await this.getEventParticipants(eventId);
    return participants.some(p => p.name.toLowerCase() === name.toLowerCase());
  }

  async removeParticipant(participantId: string): Promise<void> {
    const participant = await this.client.hGetAll(`participant:${participantId}`);
    if (!participant.id) return;
    
    await this.client.sRem(`event:${participant.eventId}:participants`, participantId);
    await this.client.del(`participant:${participantId}`);
  }

  // Winner operations
  async addWinner(winner: Winner): Promise<void> {
    await this.client.hSet(`winner:${winner.id}`, {
      id: winner.id,
      eventId: winner.eventId,
      participantId: winner.participantId,
      participantName: winner.participantName,
      drawOrder: winner.drawOrder.toString(),
      drawnAt: winner.drawnAt.toISOString()
    });
    
    await this.client.sAdd(`event:${winner.eventId}:winners`, winner.id);
  }

  async getEventWinners(eventId: string): Promise<Winner[]> {
    const winnerIds = await this.client.sMembers(`event:${eventId}:winners`);
    const winners: Winner[] = [];
    
    for (const winnerId of winnerIds) {
      const winner = await this.client.hGetAll(`winner:${winnerId}`);
      if (winner.id) {
        winners.push({
          id: winner.id,
          eventId: winner.eventId,
          participantId: winner.participantId,
          participantName: winner.participantName,
          drawOrder: parseInt(winner.drawOrder),
          drawnAt: new Date(winner.drawnAt)
        });
      }
    }
    
    return winners.sort((a, b) => a.drawOrder - b.drawOrder);
  }
}

export const redisService = new RedisService();