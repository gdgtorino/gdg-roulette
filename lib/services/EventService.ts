import { EventRepository } from '../repositories/EventRepository';
import { ParticipantService } from './ParticipantService';
import { QRCodeService } from './QRCodeService';
import { Event } from '../types';

export interface EventCreationData {
  name: string;
  description?: string;
  createdBy: string;
  state?: string;
  registrationOpen?: boolean;
  closed?: boolean;
  maxParticipants?: number;
}

export interface EventUpdateData {
  name?: string;
  description?: string;
  state?: string;
  registrationOpen?: boolean;
  closed?: boolean;
  qrCode?: string;
}

export interface EventsListResult {
  success: boolean;
  events?: Event[];
  error?: string;
}

export interface EventResult {
  success: boolean;
  event?: Event;
  error?: string;
}

export class EventService {
  private qrCodeService: QRCodeService;

  constructor(
    private eventRepository: EventRepository,
    private participantService: ParticipantService,
  ) {
    this.qrCodeService = new QRCodeService();
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: EventCreationData): Promise<Event> {
    try {
      // Generate QR code for the event
      const eventUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register`;
      const qrCode = await this.qrCodeService.generateQRCode(eventUrl);

      const event = await this.eventRepository.create({
        name: eventData.name,
        description: eventData.description,
        createdBy: eventData.createdBy,
        state: eventData.state,
        registrationOpen: eventData.registrationOpen ?? true,
        closed: eventData.closed ?? false,
        qrCode,
      });

      return event;
    } catch {
      throw new Error(`Failed to create event: `);
    }
  }

  /**
   * Create a basic event without QR code generation (for state machine)
   */
  async createBasicEvent(eventData: EventCreationData): Promise<Event> {
    try {
      const event = await this.eventRepository.create({
        name: eventData.name,
        description: eventData.description,
        createdBy: eventData.createdBy,
        state: eventData.state,
        registrationOpen: eventData.registrationOpen ?? false,
        closed: eventData.closed ?? false,
      });

      return event;
    } catch {
      throw new Error(`Failed to create basic event: `);
    }
  }

  /**
   * Find event by ID
   */
  async findById(eventId: string): Promise<Event | null> {
    try {
      return await this.eventRepository.findById(eventId);
    } catch {
      throw new Error(`Failed to find event: `);
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, updateData: EventUpdateData): Promise<Event> {
    try {
      const event = await this.eventRepository.update(eventId, updateData);
      return event;
    } catch (error) {
      // Preserve the original error message
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      return await this.eventRepository.delete(eventId);
    } catch {
      throw new Error(`Failed to delete event: `);
    }
  }

  /**
   * Get events for a specific admin
   */
  async getEventsForAdmin(adminId: string): Promise<Event[]> {
    try {
      return await this.eventRepository.findByAdminId(adminId);
    } catch {
      throw new Error(`Failed to get events for admin: `);
    }
  }

  /**
   * Get all events (for super admin)
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      return await this.eventRepository.getAll();
    } catch {
      throw new Error(`Failed to get all events: `);
    }
  }

  /**
   * Get active events
   */
  async getActiveEvents(): Promise<Event[]> {
    try {
      return await this.eventRepository.findActiveEvents();
    } catch {
      throw new Error(`Failed to get active events: `);
    }
  }

  /**
   * Get participant count for an event
   */
  async getParticipantCount(eventId: string): Promise<number> {
    try {
      return await this.participantService.getParticipantCount(eventId);
    } catch {
      throw new Error(`Failed to get participant count: `);
    }
  }

  /**
   * Check if event exists
   */
  async eventExists(eventId: string): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return event !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if admin owns event
   */
  async adminOwnsEvent(eventId: string, adminId: string): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return event?.createdBy === adminId;
    } catch {
      return false;
    }
  }

  /**
   * Generate new QR code for event
   */
  async regenerateQRCode(eventId: string): Promise<Event> {
    try {
      const event = await this.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const eventUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register/${eventId}`;
      const qrCode = await this.qrCodeService.generateQRCode(eventUrl);

      return await this.eventRepository.updateQRCode(eventId, qrCode);
    } catch {
      throw new Error(`Failed to regenerate QR code: `);
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string): Promise<{
    participantCount: number;
    winnersCount: number;
    registrationOpen: boolean;
    closed: boolean;
    createdAt: Date;
  }> {
    try {
      const event = await this.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const participantCount = await this.getParticipantCount(eventId);
      const winnersCount = event.winners?.length || 0;

      return {
        participantCount,
        winnersCount,
        registrationOpen: event.registrationOpen,
        closed: event.closed,
        createdAt: event.createdAt,
      };
    } catch {
      throw new Error(`Failed to get event statistics: `);
    }
  }

  /**
   * Get events dashboard data
   */
  async getDashboardData(): Promise<{
    totalEvents: number;
    activeEvents: number;
    closedEvents: number;
    totalParticipants: number;
  }> {
    try {
      const allEvents = await this.getAllEvents();
      const activeEvents = allEvents.filter((e) => !e.closed);
      const closedEvents = allEvents.filter((e) => e.closed);

      let totalParticipants = 0;
      for (const event of allEvents) {
        totalParticipants += event.participants?.length || 0;
      }

      return {
        totalEvents: allEvents.length,
        activeEvents: activeEvents.length,
        closedEvents: closedEvents.length,
        totalParticipants,
      };
    } catch {
      throw new Error(`Failed to get dashboard data: `);
    }
  }

  /**
   * Check if registration is open for event
   */
  async isRegistrationOpen(eventId: string): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return event?.registrationOpen === true && event?.closed === false;
    } catch {
      return false;
    }
  }

  /**
   * Check if event is closed
   */
  async isEventClosed(eventId: string): Promise<boolean> {
    try {
      const event = await this.findById(eventId);
      return event?.closed === true;
    } catch {
      return true;
    }
  }

  /**
   * Get recent events for an admin
   */
  async getRecentEvents(adminId: string, limit: number = 5): Promise<Event[]> {
    try {
      const events = await this.getEventsForAdmin(adminId);
      return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
    } catch {
      throw new Error(`Failed to get recent events: `);
    }
  }

  /**
   * Search events by name
   */
  async searchEventsByName(name: string, adminId?: string): Promise<Event[]> {
    try {
      let events: Event[];
      if (adminId) {
        events = await this.getEventsForAdmin(adminId);
      } else {
        events = await this.getAllEvents();
      }

      return events.filter((event) => event.name.toLowerCase().includes(name.toLowerCase()));
    } catch {
      throw new Error(`Failed to search events: `);
    }
  }

  /**
   * Get event summary for display
   */
  async getEventSummary(eventId: string): Promise<{
    id: string;
    name: string;
    participantCount: number;
    winnersCount: number;
    status: 'INIT' | 'REGISTRATION' | 'DRAW' | 'CLOSED';
    createdAt: Date;
  }> {
    try {
      const event = await this.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const participantCount = event.participants?.length || 0;
      const winnersCount = event.winners?.length || 0;

      // Determine status based on event state
      let status: 'INIT' | 'REGISTRATION' | 'DRAW' | 'CLOSED';
      if (event.closed) {
        status = 'CLOSED';
      } else if (winnersCount > 0 || (!event.registrationOpen && participantCount > 0)) {
        status = 'DRAW';
      } else if (event.registrationOpen) {
        status = 'REGISTRATION';
      } else {
        status = 'INIT';
      }

      return {
        id: event.id,
        name: event.name,
        participantCount,
        winnersCount,
        status,
        createdAt: event.createdAt,
      };
    } catch {
      throw new Error(`Failed to get event summary: `);
    }
  }

  /**
   * Auto-close event when all participants have been drawn
   */
  async autoCloseEvent(eventId: string): Promise<Event> {
    try {
      const event = await this.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.closed) {
        return event; // Already closed
      }

      // Update the event to closed state
      const updatedEvent = await this.updateEvent(eventId, {
        closed: true,
        state: 'CLOSED',
        registrationOpen: false,
      });

      return updatedEvent;
    } catch (error) {
      throw new Error(
        `Failed to auto-close event: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
