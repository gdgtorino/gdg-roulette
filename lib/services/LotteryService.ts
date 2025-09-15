import { ParticipantService } from './ParticipantService';
import { WinnerService } from './WinnerService';
import { NotificationService } from './NotificationService';
import { EventService } from './EventService';
import { RandomService } from './RandomService';
import { Participant, Winner } from '../types';

export interface DrawResult {
  success: boolean;
  winner?: Winner;
  error?: string;
}

export interface DrawBatchResult {
  success: boolean;
  winners: Winner[];
  error?: string;
}

export class LotteryService {
  constructor(
    private participantService: ParticipantService,
    private winnerService: WinnerService,
    private notificationService: NotificationService,
    private eventService: EventService,
    private randomService: RandomService
  ) {}

  /**
   * Draw a single winner from the remaining participants (with admin verification)
   */
  async drawSingleWinner(eventId: string, adminId: string): Promise<DrawResult> {
    try {
      // Check if event exists and is in the correct state
      const event = await this.eventService.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Cannot draw from a closed event'
        };
      }

      // Verify admin owns the event (if createdBy is set)
      if (event.createdBy && event.createdBy !== adminId) {
        return {
          success: false,
          error: 'Only event creator can perform draw'
        };
      }

      // Get available participants (not yet winners)
      const availableParticipants = await this.participantService.getAvailableParticipants(eventId);
      if (availableParticipants.length === 0) {
        return {
          success: false,
          error: 'No participants available for drawing'
        };
      }

      // Check if event has reached maximum draws
      const currentWinnerCount = await this.winnerService.getWinnerCount(eventId);
      const maxParticipants = event.maxParticipants || availableParticipants.length;
      if (currentWinnerCount >= maxParticipants) {
        return {
          success: false,
          error: 'All participants have been drawn'
        };
      }

      // Use random service to select winner
      const selectedParticipant = await this.randomService.selectRandomParticipant(availableParticipants);

      // Create winner record
      const winner = await this.winnerService.createWinner({
        eventId,
        participantId: selectedParticipant.id,
        participantName: selectedParticipant.name,
        drawOrder: currentWinnerCount + 1
      });

      // Notify winner and broadcast update
      try {
        await this.notificationService.notifyWinner(winner);
        await this.notificationService.broadcastDrawUpdate(eventId, winner);
      } catch (notificationError) {
        // Log error but don't fail the draw
        console.error('Notification failed:', notificationError);
      }

      return {
        success: true,
        winner
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during draw'
      };
    }
  }

  /**
   * Draw a single winner from the remaining participants (legacy method)
   */
  async drawWinner(eventId: string): Promise<DrawResult> {
    try {
      // Check if event exists and is in the correct state
      const event = await this.eventService.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Cannot draw from a closed event'
        };
      }

      if (event.registrationOpen) {
        return {
          success: false,
          error: 'Cannot draw while registration is still open'
        };
      }

      // Get all participants who haven't been drawn yet
      const undrawenParticipants = await this.participantRepository.getAllUndrawn(eventId);

      if (undrawenParticipants.length === 0) {
        return {
          success: false,
          error: 'No more participants to draw'
        };
      }

      // Randomly select a participant
      const randomIndex = this.getSecureRandomIndex(undrawenParticipants.length);
      const selectedParticipant = undrawenParticipants[randomIndex];

      // Get the next draw order
      const currentWinnerCount = await this.getWinnerCount(eventId);
      const drawOrder = currentWinnerCount + 1;

      // Create winner record
      const winner = await prisma.winner.create({
        data: {
          eventId,
          participantId: selectedParticipant.id,
          participantName: selectedParticipant.name,
          drawOrder
        }
      });

      // Send real-time notification
      await this.notificationService.notifyWinnerDrawn(eventId, winner);

      return {
        success: true,
        winner
      };
    } catch (error) {
      return {
        success: false,
        error: `Draw failed: ${error}`
      };
    }
  }

  /**
   * Draw multiple winners at once
   */
  async drawMultipleWinners(eventId: string, count: number): Promise<DrawBatchResult> {
    try {
      const winners: Winner[] = [];
      const errors: string[] = [];

      for (let i = 0; i < count; i++) {
        const result = await this.drawWinner(eventId);
        if (result.success && result.winner) {
          winners.push(result.winner);
        } else {
          errors.push(result.error || 'Unknown error');
          break; // Stop on first error
        }
      }

      return {
        success: winners.length > 0,
        winners,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };
    } catch (error) {
      return {
        success: false,
        winners: [],
        error: `Batch draw failed: ${error}`
      };
    }
  }

  /**
   * Draw all remaining participants
   */
  async drawAllRemaining(eventId: string): Promise<DrawBatchResult> {
    try {
      const undrawenCount = await this.participantRepository.getUndrawenCount(eventId);
      return await this.drawMultipleWinners(eventId, undrawenCount);
    } catch (error) {
      return {
        success: false,
        winners: [],
        error: `Draw all failed: ${error}`
      };
    }
  }

  /**
   * Get all winners for an event
   */
  async getWinners(eventId: string): Promise<Winner[]> {
    try {
      return await this.winnerService.getWinnersByEvent(eventId);
    } catch (error) {
      throw new Error(`Failed to get winners: ${error}`);
    }
  }

  /**
   * Get winner count for an event
   */
  async getWinnerCount(eventId: string): Promise<number> {
    try {
      return await this.winnerService.getWinnerCount(eventId);
    } catch (error) {
      throw new Error(`Failed to get winner count: ${error}`);
    }
  }

  /**
   * Get winner by draw order
   */
  async getWinnerByOrder(eventId: string, drawOrder: number): Promise<Winner | null> {
    try {
      const winner = await prisma.winner.findUnique({
        where: {
          eventId_drawOrder: {
            eventId,
            drawOrder
          }
        }
      });
      return winner;
    } catch (error) {
      throw new Error(`Failed to get winner by order: ${error}`);
    }
  }

  /**
   * Get the next winner to be drawn (for display purposes)
   */
  async getNextWinner(eventId: string): Promise<Participant | null> {
    try {
      const undrawenParticipants = await this.participantRepository.getAllUndrawn(eventId);
      if (undrawenParticipants.length === 0) {
        return null;
      }

      // Return the first undrawn participant (could be randomized for preview)
      return undrawenParticipants[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if more winners can be drawn
   */
  async canDrawMore(eventId: string): Promise<boolean> {
    try {
      const undrawenCount = await this.participantRepository.getUndrawenCount(eventId);
      return undrawenCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get lottery statistics
   */
  async getLotteryStats(eventId: string): Promise<{
    totalParticipants: number;
    drawnWinners: number;
    remainingParticipants: number;
    drawProgress: number;
  }> {
    try {
      const totalParticipants = await this.participantRepository.getCount(eventId);
      const drawnWinners = await this.getWinnerCount(eventId);
      const remainingParticipants = totalParticipants - drawnWinners;
      const drawProgress = totalParticipants > 0 ? (drawnWinners / totalParticipants) * 100 : 0;

      return {
        totalParticipants,
        drawnWinners,
        remainingParticipants,
        drawProgress: Math.round(drawProgress * 100) / 100
      };
    } catch (error) {
      throw new Error(`Failed to get lottery statistics: ${error}`);
    }
  }

  /**
   * Reset lottery (remove all winners) - Admin only
   */
  async resetLottery(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if event exists
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      if (event.closed) {
        return {
          success: false,
          error: 'Cannot reset a closed event'
        };
      }

      // Delete all winners for this event
      await prisma.winner.deleteMany({
        where: { eventId }
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reset lottery: ${error}`
      };
    }
  }

  /**
   * Get winners with participant details
   */
  async getWinnersWithDetails(eventId: string): Promise<Array<Winner & { participant: Participant }>> {
    try {
      const winners = await prisma.winner.findMany({
        where: { eventId },
        include: {
          participant: true
        },
        orderBy: { drawOrder: 'asc' }
      });
      return winners as Array<Winner & { participant: Participant }>;
    } catch (error) {
      throw new Error(`Failed to get winners with details: ${error}`);
    }
  }

  /**
   * Export lottery results
   */
  async exportResults(eventId: string): Promise<{
    success: boolean;
    data?: {
      event: { id: string; name: string; createdAt: Date };
      winners: Array<{
        drawOrder: number;
        participantName: string;
        drawnAt: Date;
      }>;
      stats: {
        totalParticipants: number;
        totalWinners: number;
        drawDate: Date;
      };
    };
    error?: string;
  }> {
    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found'
        };
      }

      const winners = await this.getWinners(eventId);
      const stats = await this.getLotteryStats(eventId);

      return {
        success: true,
        data: {
          event: {
            id: event.id,
            name: event.name,
            createdAt: event.createdAt
          },
          winners: winners.map(winner => ({
            drawOrder: winner.drawOrder,
            participantName: winner.participantName,
            drawnAt: winner.drawnAt
          })),
          stats: {
            totalParticipants: stats.totalParticipants,
            totalWinners: stats.drawnWinners,
            drawDate: winners.length > 0 ? winners[0].drawnAt : new Date()
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to export results: ${error}`
      };
    }
  }

  /**
   * Validate lottery state before drawing
   */
  async validateDrawState(eventId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const event = await this.eventRepository.findById(eventId);
      if (!event) {
        errors.push('Event not found');
        return { valid: false, errors };
      }

      if (event.closed) {
        errors.push('Event is closed');
      }

      if (event.registrationOpen) {
        errors.push('Registration is still open');
      }

      const participantCount = await this.participantRepository.getCount(eventId);
      if (participantCount === 0) {
        errors.push('No participants registered');
      }

      const undrawenCount = await this.participantRepository.getUndrawenCount(eventId);
      if (undrawenCount === 0) {
        errors.push('All participants have already been drawn');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Validation failed: ${error}`);
      return { valid: false, errors };
    }
  }

  /**
   * Generate cryptographically secure random index
   */
  private getSecureRandomIndex(max: number): number {
    // Use crypto.getRandomValues if available (browser/Node.js)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % max;
    }

    // Fallback to Math.random (less secure but works everywhere)
    return Math.floor(Math.random() * max);
  }

  /**
   * Get draw history for an event
   */
  async getDrawHistory(eventId: string): Promise<Array<{
    drawOrder: number;
    participantName: string;
    drawnAt: Date;
    timeSinceLastDraw?: number; // in seconds
  }>> {
    try {
      const winners = await this.getWinners(eventId);

      return winners.map((winner, index) => {
        let timeSinceLastDraw: number | undefined;

        if (index > 0) {
          const previousWinner = winners[index - 1];
          timeSinceLastDraw = Math.floor(
            (winner.drawnAt.getTime() - previousWinner.drawnAt.getTime()) / 1000
          );
        }

        return {
          drawOrder: winner.drawOrder,
          participantName: winner.participantName,
          drawnAt: winner.drawnAt,
          timeSinceLastDraw
        };
      });
    } catch (error) {
      throw new Error(`Failed to get draw history: ${error}`);
    }
  }
}