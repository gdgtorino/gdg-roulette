import { ParticipantRepository } from '../repositories/ParticipantRepository';
import { EventRepository } from '../repositories/EventRepository';
import { ValidationService } from './ValidationService';
import { NotificationService } from './NotificationService';
import { Participant } from '../types';

export interface ParticipantRegistrationData {
  eventId: string;
  name: string;
}

export interface RegistrationResult {
  success: boolean;
  participant?: Participant;
  error?: string;
}

export interface ParticipantsListResult {
  success: boolean;
  participants?: Participant[];
  error?: string;
}

export class ParticipantService {
  private validationService: ValidationService;
  private notificationService: NotificationService;

  constructor(
    private participantRepository: ParticipantRepository,
    private eventRepository: EventRepository,
  ) {
    this.validationService = new ValidationService();
    this.notificationService = new NotificationService();
  }

  /**
   * Register a new participant for an event
   */
  async registerParticipant(
    registrationData: ParticipantRegistrationData,
  ): Promise<RegistrationResult> {
    try {
      const { eventId, name } = registrationData;

      // Validate input
      const validation = this.validationService.validateParticipantRegistration(registrationData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      // Check if event exists and registration is open
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      if (!event.registrationOpen) {
        return {
          success: false,
          error: 'Registration is not open for this event',
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Event is closed',
        };
      }

      // Check for duplicate registration
      const existingParticipant = await this.participantRepository.findByEventIdAndName(
        eventId,
        name,
      );
      if (existingParticipant) {
        return {
          success: false,
          error: 'A participant with this name is already registered',
        };
      }

      // Create participant
      const participant = await this.participantRepository.create({
        eventId,
        name: name.trim(),
      });

      // Send real-time notification
      await this.notificationService.notifyParticipantRegistered(eventId, participant);

      return {
        success: true,
        participant,
      };
    } catch {
      return {
        success: false,
        error: `Registration failed: `,
      };
    }
  }

  /**
   * Get all participants for an event
   */
  async getParticipants(eventId: string): Promise<ParticipantsListResult> {
    try {
      const participants = await this.participantRepository.findByEventId(eventId);
      return {
        success: true,
        participants,
      };
    } catch {
      return {
        success: false,
        error: `Failed to get participants: `,
      };
    }
  }

  /**
   * Get participant count for an event
   */
  async getParticipantCount(eventId: string): Promise<number> {
    try {
      return await this.participantRepository.getCount(eventId);
    } catch {
      throw new Error(`Failed to get participant count: `);
    }
  }

  /**
   * Get participant by ID
   */
  async getParticipantById(participantId: string): Promise<Participant | null> {
    try {
      return await this.participantRepository.findById(participantId);
    } catch {
      throw new Error(`Failed to get participant: `);
    }
  }

  /**
   * Update participant information
   */
  async updateParticipant(
    participantId: string,
    updateData: { name?: string },
  ): Promise<RegistrationResult> {
    try {
      // Validate new name if provided
      if (updateData.name) {
        const nameValidation = this.validationService.validateParticipantName(updateData.name);
        if (!nameValidation.valid) {
          return {
            success: false,
            error: nameValidation.errors.join('; '),
          };
        }

        // Check for duplicate name in the same event
        const participant = await this.participantRepository.findById(participantId);
        if (!participant) {
          return {
            success: false,
            error: 'Participant not found',
          };
        }

        const existingParticipant = await this.participantRepository.findByEventIdAndName(
          participant.eventId,
          updateData.name,
        );
        if (existingParticipant && existingParticipant.id !== participantId) {
          return {
            success: false,
            error: 'A participant with this name already exists in this event',
          };
        }
      }

      const updatedParticipant = await this.participantRepository.update(participantId, updateData);
      return {
        success: true,
        participant: updatedParticipant,
      };
    } catch {
      return {
        success: false,
        error: `Failed to update participant: `,
      };
    }
  }

  /**
   * Remove participant from event
   */
  async removeParticipant(participantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const participant = await this.participantRepository.findById(participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found',
        };
      }

      // Check if event allows participant removal (not in draw or closed state)
      const event = await this.eventRepository.findById(participant.eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Cannot remove participants from a closed event',
        };
      }

      // Check if participant has already been drawn as a winner
      const hasWon = event.winners?.some((winner) => winner.participantId === participantId);
      if (hasWon) {
        return {
          success: false,
          error: 'Cannot remove a participant who has already won',
        };
      }

      await this.participantRepository.delete(participantId);
      return { success: true };
    } catch {
      return {
        success: false,
        error: `Failed to remove participant: `,
      };
    }
  }

  /**
   * Get undrawn participants for lottery
   */
  async getUndrawenParticipants(eventId: string): Promise<Participant[]> {
    try {
      return await this.participantRepository.getAllUndrawn(eventId);
    } catch {
      throw new Error(`Failed to get undrawn participants: `);
    }
  }

  /**
   * Get available participants (alias for undrawn participants for test compatibility)
   */
  async getAvailableParticipants(eventId: string): Promise<Participant[]> {
    return this.getUndrawenParticipants(eventId);
  }

  /**
   * Get all participants for an event (test compatibility method)
   */
  async getAllParticipants(eventId: string): Promise<Participant[]> {
    try {
      const result = await this.getParticipants(eventId);
      return result.participants || [];
    } catch {
      throw new Error(`Failed to get all participants: `);
    }
  }

  /**
   * Get total participant count (alias for getParticipantCount for test compatibility)
   */
  async getTotalParticipants(eventId: string): Promise<number> {
    return this.getParticipantCount(eventId);
  }

  /**
   * Get count of undrawn participants
   */
  async getUndrawenCount(eventId: string): Promise<number> {
    try {
      return await this.participantRepository.getUndrawenCount(eventId);
    } catch {
      throw new Error(`Failed to get undrawn count: `);
    }
  }

  /**
   * Create a participant (alias for registerParticipant)
   */
  async create(data: { eventId: string; name: string }): Promise<Participant> {
    const result = await this.registerParticipant(data);
    if (!result.success || !result.participant) {
      throw new Error(result.error || 'Failed to create participant');
    }
    return result.participant;
  }

  /**
   * Delete a participant (alias for removeParticipant)
   */
  async delete(participantId: string): Promise<boolean> {
    const result = await this.removeParticipant(participantId);
    return result.success;
  }

  /**
   * Find participant by event and name
   */
  async findByEventAndName(eventId: string, name: string): Promise<Participant | null> {
    try {
      return await this.participantRepository.findByEventIdAndName(eventId, name);
    } catch {
      return null;
    }
  }

  /**
   * Check if participant exists in event
   */
  async participantExists(eventId: string, name: string): Promise<boolean> {
    try {
      const participant = await this.participantRepository.findByEventIdAndName(eventId, name);
      return participant !== null;
    } catch {
      return false;
    }
  }

  /**
   * Bulk register participants
   */
  async bulkRegisterParticipants(
    eventId: string,
    participants: { name: string }[],
  ): Promise<{
    success: boolean;
    registeredCount: number;
    failedRegistrations: { name: string; error: string }[];
    error?: string;
  }> {
    try {
      // Check if event exists and registration is open
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          registeredCount: 0,
          failedRegistrations: [],
          error: 'Event not found',
        };
      }

      if (!event.registrationOpen || event.closed) {
        return {
          success: false,
          registeredCount: 0,
          failedRegistrations: [],
          error: 'Registration is not open for this event',
        };
      }

      const failedRegistrations: { name: string; error: string }[] = [];
      let registeredCount = 0;

      for (const participantData of participants) {
        try {
          const result = await this.registerParticipant({
            eventId,
            name: participantData.name,
          });

          if (result.success) {
            registeredCount++;
          } else {
            failedRegistrations.push({
              name: participantData.name,
              error: result.error || 'Registration failed',
            });
          }
        } catch {
          failedRegistrations.push({
            name: participantData.name,
            error: `Registration failed: `,
          });
        }
      }

      return {
        success: registeredCount > 0,
        registeredCount,
        failedRegistrations,
      };
    } catch {
      return {
        success: false,
        registeredCount: 0,
        failedRegistrations: [],
        error: `Bulk registration failed: `,
      };
    }
  }

  /**
   * Get participant statistics for an event
   */
  async getParticipantStats(eventId: string): Promise<{
    totalCount: number;
    undrawenCount: number;
    winnersCount: number;
    registrationRate: number;
  }> {
    try {
      const totalCount = await this.getParticipantCount(eventId);
      const undrawenCount = await this.getUndrawenCount(eventId);
      const winnersCount = totalCount - undrawenCount;

      // Calculate registration rate (participants per hour since event creation)
      const event = await this.eventRepository.findById(eventId);
      const hoursSinceCreation = event
        ? Math.max(1, (Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60))
        : 1;
      const registrationRate = totalCount / hoursSinceCreation;

      return {
        totalCount,
        undrawenCount,
        winnersCount,
        registrationRate: Math.round(registrationRate * 100) / 100,
      };
    } catch {
      throw new Error(`Failed to get participant statistics: `);
    }
  }

  /**
   * Clear all participants from an event (admin only)
   */
  async clearAllParticipants(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if event exists
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Cannot clear participants from a closed event',
        };
      }

      // Check if any participants have been drawn as winners
      if (event.winners && event.winners.length > 0) {
        return {
          success: false,
          error: 'Cannot clear participants after winners have been drawn',
        };
      }

      await this.participantRepository.deleteAllByEventId(eventId);
      return { success: true };
    } catch {
      return {
        success: false,
        error: `Failed to clear participants: `,
      };
    }
  }
}
