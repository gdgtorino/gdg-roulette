/**
 * Lottery System Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LotteryService } from '../lib/services/LotteryService';
import { ParticipantService } from '../lib/services/ParticipantService';
import { WinnerService } from '../lib/services/WinnerService';
import { NotificationService } from '../lib/services/NotificationService';
import { EventService } from '../lib/services/EventService';
import { RandomService } from '../lib/services/RandomService';
import { EventState } from '../lib/state/EventStateMachine';
import { LotteryComponent } from '../components/LotteryComponent';

// Mock services
const mockParticipantService = {
  findByEventId: jest.fn(),
  findById: jest.fn(),
  findByEventAndName: jest.fn(),
  create: jest.fn(),
  getAvailableParticipants: jest.fn(),
  getAllParticipants: jest.fn(),
  getTotalParticipants: jest.fn()
};

const mockWinnerService = {
  create: jest.fn(),
  findByEventId: jest.fn(),
  findByParticipantId: jest.fn(),
  getWinnersCount: jest.fn(),
  getWinnerCount: jest.fn(),
  createWinner: jest.fn(),
  isParticipantWinner: jest.fn()
};

const mockNotificationService = {
  notifyWinner: jest.fn(),
  notifyAllParticipants: jest.fn(),
  sendRealTimeUpdate: jest.fn(),
  connectToLiveUpdates: jest.fn(),
  broadcastDrawUpdate: jest.fn(),
  sendEmailNotification: jest.fn(),
  sendSMSNotification: jest.fn()
};

const mockEventService = {
  findById: jest.fn(),
  updateState: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  autoCloseEvent: jest.fn()
};

const mockRandomService = {
  selectRandom: jest.fn(),
  generateRandomId: jest.fn(),
  shuffle: jest.fn(),
  selectRandomParticipant: jest.fn()
};

describe('Lottery System', () => {
  let lotteryService: LotteryService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize lottery service
    lotteryService = new LotteryService(
      mockParticipantService as any,
      mockWinnerService as any,
      mockNotificationService as any,
      mockEventService as any,
      mockRandomService as any
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Iterative Winner Extraction', () => {
    it('should extract winner one at a time from available participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId },
        { id: 'p3', name: 'Charlie', eventId },
        { id: 'p4', name: 'Diana', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[1]); // Bob selected

      const expectedWinner = {
        id: 'winner-1',
        eventId,
        participantId: 'p2',
        participantName: 'Bob',
        drawOrder: 1,
        drawnAt: new Date()
      };

      mockWinnerService.createWinner.mockResolvedValue(expectedWinner);
      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.winner).toEqual(expectedWinner);
      expect(result.winner.drawOrder).toBe(1);
      expect(mockParticipantService.getAvailableParticipants).toHaveBeenCalledWith(eventId);
      expect(mockRandomService.selectRandomParticipant).toHaveBeenCalledWith(participants);
      expect(mockWinnerService.createWinner).toHaveBeenCalledWith({
        eventId,
        participantId: 'p2',
        participantName: 'Bob',
        drawOrder: 1
      });
      expect(mockNotificationService.notifyWinner).toHaveBeenCalledWith(expectedWinner);
    });

    it('should draw multiple winners sequentially with correct order', async () => {
      // Arrange
      const eventId = 'event-123';
      let availableParticipants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId },
        { id: 'p3', name: 'Charlie', eventId },
        { id: 'p4', name: 'Diana', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);

      // Mock sequential winner selection
      let winnerCount = 0;
      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(availableParticipants.slice(winnerCount));
      });

      mockWinnerService.getWinnerCount.mockImplementation(() => Promise.resolve(winnerCount));

      mockRandomService.selectRandomParticipant
        .mockResolvedValueOnce(availableParticipants[2]) // Charlie first
        .mockResolvedValueOnce(availableParticipants[0]) // Alice second
        .mockResolvedValueOnce(availableParticipants[1]); // Bob third

      mockWinnerService.createWinner.mockImplementation((data) => {
        winnerCount++;
        return Promise.resolve({
          id: `winner-${winnerCount}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const winner1 = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const winner2 = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const winner3 = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(winner1.success).toBe(true);
      expect(winner1.winner.participantName).toBe('Charlie');
      expect(winner1.winner.drawOrder).toBe(1);

      expect(winner2.success).toBe(true);
      expect(winner2.winner.participantName).toBe('Alice');
      expect(winner2.winner.drawOrder).toBe(2);

      expect(winner3.success).toBe(true);
      expect(winner3.winner.participantName).toBe('Bob');
      expect(winner3.winner.drawOrder).toBe(3);
    });

    it('should prevent drawing from same participant pool twice', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants
        .mockResolvedValueOnce(participants)
        .mockResolvedValueOnce([participants[0]]); // Bob already selected

      mockWinnerService.getWinnerCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      mockRandomService.selectRandomParticipant
        .mockResolvedValueOnce(participants[1]) // Bob first
        .mockResolvedValueOnce(participants[0]); // Alice second

      mockWinnerService.createWinner
        .mockResolvedValueOnce({
          id: 'winner-1',
          eventId,
          participantId: 'p2',
          participantName: 'Bob',
          drawOrder: 1,
          drawnAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'winner-2',
          eventId,
          participantId: 'p1',
          participantName: 'Alice',
          drawOrder: 2,
          drawnAt: new Date()
        });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const winner1 = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const winner2 = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(winner1.winner.participantName).toBe('Bob');
      expect(winner2.winner.participantName).toBe('Alice');
      expect(winner1.winner.participantId).not.toBe(winner2.winner.participantId);
    });

    it('should handle empty participant pool', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue([]);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No participants available for drawing');
      expect(mockWinnerService.createWinner).not.toHaveBeenCalled();
      expect(mockNotificationService.notifyWinner).not.toHaveBeenCalled();
    });

    it('should handle all participants already selected', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue([]);
      mockParticipantService.getTotalParticipants.mockResolvedValue(5);
      mockWinnerService.getWinnerCount.mockResolvedValue(5);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('All participants have already been drawn');
    });
  });

  describe('Real-time Winner Notifications', () => {
    it('should notify winner immediately after selection', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId, sessionId: 'session-1' },
        { id: 'p2', name: 'Bob', eventId, sessionId: 'session-2' }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      const selectedWinner = {
        id: 'winner-1',
        eventId,
        participantId: 'p1',
        participantName: 'Alice',
        drawOrder: 1,
        drawnAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[0]);
      mockWinnerService.createWinner.mockResolvedValue(selectedWinner);
      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockNotificationService.notifyWinner).toHaveBeenCalledWith(selectedWinner);
      // Verify notification was called (order testing would require more complex setup)
      expect(mockNotificationService.notifyWinner).toHaveBeenCalledTimes(1);
    });

    it('should send real-time updates to all participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId, sessionId: 'session-1' },
        { id: 'p2', name: 'Bob', eventId, sessionId: 'session-2' },
        { id: 'p3', name: 'Charlie', eventId, sessionId: 'session-3' }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      const selectedWinner = {
        id: 'winner-1',
        eventId,
        participantId: 'p2',
        participantName: 'Bob',
        drawOrder: 1,
        drawnAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[1]);
      mockWinnerService.createWinner.mockResolvedValue(selectedWinner);
      mockNotificationService.notifyWinner.mockResolvedValue(true);
      mockNotificationService.broadcastDrawUpdate.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockNotificationService.broadcastDrawUpdate).toHaveBeenCalledWith(eventId, {
        type: 'WINNER_DRAWN',
        winner: selectedWinner,
        drawOrder: 1,
        timestamp: expect.any(Date)
      });
    });

    it('should handle notification failures gracefully', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      const selectedWinner = {
        id: 'winner-1',
        eventId,
        participantId: 'p1',
        participantName: 'Alice',
        drawOrder: 1,
        drawnAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[0]);
      mockWinnerService.createWinner.mockResolvedValue(selectedWinner);
      mockNotificationService.notifyWinner.mockRejectedValue(new Error('Notification failed'));

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true); // Draw still succeeds
      expect(result.warning).toBe('Winner selected but notification failed');
      expect(result.winner).toEqual(selectedWinner);
    });

    it('should provide different notification types', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId, email: 'alice@example.com' },
        { id: 'p2', name: 'Bob', eventId, phone: '+1234567890' }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[0]);

      const selectedWinner = {
        id: 'winner-1',
        eventId,
        participantId: 'p1',
        participantName: 'Alice',
        drawOrder: 1,
        drawnAt: new Date()
      };

      mockWinnerService.createWinner.mockResolvedValue(selectedWinner);
      mockNotificationService.notifyWinner.mockResolvedValue(true);
      mockNotificationService.sendEmailNotification.mockResolvedValue(true);
      mockNotificationService.sendSMSNotification.mockResolvedValue(true);

      // Act
      await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(mockNotificationService.notifyWinner).toHaveBeenCalledWith(selectedWinner);
      // Additional notification methods should be called based on participant contact info
    });
  });

  describe('Extract All Participants Capability', () => {
    it('should draw all remaining participants in sequence', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId },
        { id: 'p3', name: 'Charlie', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);

      // Mock getting all participants for bulk draw
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);

      // Mock sequential random selection
      mockRandomService.selectRandomParticipant
        .mockResolvedValueOnce(participants[1]) // Bob first
        .mockResolvedValueOnce(participants[0]) // Alice second
        .mockResolvedValueOnce(participants[2]); // Charlie third

      mockWinnerService.createWinner.mockImplementation((data) => Promise.resolve({
        id: `winner-${data.drawOrder}`,
        eventId: data.eventId,
        participantId: data.participantId,
        participantName: data.participantName,
        drawOrder: data.drawOrder,
        drawnAt: new Date()
      }));

      mockNotificationService.notifyWinner.mockResolvedValue(true);
      mockNotificationService.broadcastDrawUpdate.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawAllRemaining(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.winners).toHaveLength(3);
      expect(result.winners[0].participantName).toBe('Bob');
      expect(result.winners[0].drawOrder).toBe(1);
      expect(result.winners[1].participantName).toBe('Alice');
      expect(result.winners[1].drawOrder).toBe(2);
      expect(result.winners[2].participantName).toBe('Charlie');
      expect(result.winners[2].drawOrder).toBe(3);
    });

    it('should maintain correct draw order when drawing all', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Participant ${i + 1}`,
        eventId
      }));

      const mockEvent = {
        id: eventId,
        name: 'Large Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);

      // Track drawn participants
      const drawnParticipantIds = new Set<string>();

      // Mock getAvailableParticipants to return undrawn participants
      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(participants.filter(p => !drawnParticipantIds.has(p.id)));
      });

      mockRandomService.selectRandomParticipant.mockImplementation((availableParticipants) => {
        if (availableParticipants.length === 0) {
          return Promise.resolve(null);
        }
        // Return the first participant to ensure deterministic testing
        const selectedParticipant = availableParticipants[0];
        return Promise.resolve(selectedParticipant);
      });

      mockWinnerService.createWinner.mockImplementation((data) => {
        drawnParticipantIds.add(data.participantId);
        return Promise.resolve({
          id: `winner-${data.drawOrder}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawAllRemaining(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.winners).toHaveLength(10);

      // Verify draw order is sequential
      result.winners.forEach((winner, index) => {
        expect(winner.drawOrder).toBe(index + 1);
      });

      // Verify all participants are included
      const winnerIds = result.winners.map(w => w.participantId);
      const participantIds = participants.map(p => p.id);
      expect(winnerIds.sort()).toEqual(participantIds.sort());
    });

    it('should handle partial draws and continue from correct order', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId },
        { id: 'p3', name: 'Charlie', eventId },
        { id: 'p4', name: 'Diana', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      // First draw single winner
      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants
        .mockResolvedValueOnce(participants) // All 4 available
        .mockResolvedValueOnce(participants.slice(1)); // 3 remaining after first draw

      mockWinnerService.getWinnerCount
        .mockResolvedValueOnce(0) // No winners initially
        .mockResolvedValueOnce(1); // 1 winner after first draw

      mockRandomService.selectRandomParticipant
        .mockResolvedValueOnce(participants[0]) // Alice first
        .mockResolvedValueOnce(participants[1]) // Bob second
        .mockResolvedValueOnce(participants[2]) // Charlie third
        .mockResolvedValueOnce(participants[3]); // Diana fourth

      mockWinnerService.createWinner.mockImplementation((data) => Promise.resolve({
        id: `winner-${data.drawOrder}`,
        eventId: data.eventId,
        participantId: data.participantId,
        participantName: data.participantName,
        drawOrder: data.drawOrder,
        drawnAt: new Date()
      }));

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const firstWinner = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Update available participants for draw all remaining
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants.slice(1));

      const remainingResult = await lotteryService.drawAllRemaining(eventId, 'admin-123');

      // Assert
      expect(firstWinner.success).toBe(true);
      expect(firstWinner.winner.drawOrder).toBe(1);

      expect(remainingResult.success).toBe(true);
      expect(remainingResult.winners).toHaveLength(3);
      expect(remainingResult.winners[0].drawOrder).toBe(2);
      expect(remainingResult.winners[1].drawOrder).toBe(3);
      expect(remainingResult.winners[2].drawOrder).toBe(4);
    });

    it('should auto-close event when all participants are drawn', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockParticipantService.getTotalParticipants.mockResolvedValue(2);

      // Mock getAvailableParticipants to simulate drawing
      mockParticipantService.getAvailableParticipants
        .mockResolvedValueOnce(participants)
        .mockResolvedValueOnce([participants[0]]);

      mockRandomService.selectRandomParticipant
        .mockResolvedValueOnce(participants[1])
        .mockResolvedValueOnce(participants[0]);

      mockWinnerService.createWinner.mockImplementation((data) => Promise.resolve({
        id: `winner-${data.drawOrder}`,
        eventId: data.eventId,
        participantId: data.participantId,
        participantName: data.participantName,
        drawOrder: data.drawOrder,
        drawnAt: new Date()
      }));

      mockNotificationService.notifyWinner.mockResolvedValue(true);
      mockEventService.autoCloseEvent.mockResolvedValue({
        ...mockEvent,
        state: EventState.CLOSED,
        closed: true
      });

      // Act
      const result = await lotteryService.drawAllRemaining(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.eventClosed).toBe(true);
      expect(mockEventService.autoCloseEvent).toHaveBeenCalledWith(eventId);
    });
  });

  describe('Winner Uniqueness per Event', () => {
    it('should ensure each participant can only win once per event', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);

      // Track drawn participants
      const drawnParticipantIds = new Set<string>();

      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(participants.filter(p => !drawnParticipantIds.has(p.id)));
      });

      mockWinnerService.getWinnerCount.mockImplementation(() => Promise.resolve(drawnParticipantIds.size));

      mockWinnerService.isParticipantWinner.mockImplementation((eventId, participantId) =>
        Promise.resolve(drawnParticipantIds.has(participantId))
      );

      mockRandomService.selectRandomParticipant.mockImplementation((availableParticipants) => {
        return Promise.resolve(availableParticipants[0] || null);
      });

      mockWinnerService.createWinner.mockImplementation((data) => {
        drawnParticipantIds.add(data.participantId);
        return Promise.resolve({
          id: `winner-${data.drawOrder}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const firstDraw = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const secondDraw = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(firstDraw.success).toBe(true);
      expect(firstDraw.winner.participantName).toBe('Alice');

      expect(secondDraw.success).toBe(true);
      expect(secondDraw.winner.participantName).toBe('Bob');
      expect(secondDraw.winner.participantId).not.toBe(firstDraw.winner.participantId);
    });

    it('should track winners across multiple draws', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [
        { id: 'p1', name: 'Alice', eventId },
        { id: 'p2', name: 'Bob', eventId },
        { id: 'p3', name: 'Charlie', eventId }
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);

      const drawnParticipants = new Set<string>();

      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(
          participants.filter(p => !drawnParticipants.has(p.id))
        );
      });

      mockWinnerService.getWinnerCount.mockImplementation(() =>
        Promise.resolve(drawnParticipants.size)
      );

      mockParticipantService.getTotalParticipants.mockResolvedValue(3);

      mockWinnerService.isParticipantWinner.mockImplementation((eventId, participantId) =>
        Promise.resolve(drawnParticipants.has(participantId))
      );

      mockRandomService.selectRandomParticipant.mockImplementation((available) =>
        Promise.resolve(available[0] || null)
      );

      mockWinnerService.createWinner.mockImplementation((data) => {
        drawnParticipants.add(data.participantId);
        return Promise.resolve({
          id: `winner-${data.drawOrder}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const draw1 = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const draw2 = await lotteryService.drawSingleWinner(eventId, 'admin-123');
      const draw3 = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(draw1.success).toBe(true);
      expect(draw2.success).toBe(true);
      expect(draw3.success).toBe(true);

      const allWinnerIds = [
        draw1.winner!.participantId,
        draw2.winner!.participantId,
        draw3.winner!.participantId
      ];

      // Verify uniqueness
      const uniqueWinnerIds = new Set(allWinnerIds);
      expect(uniqueWinnerIds.size).toBe(3);
      expect(allWinnerIds).toHaveLength(3);
    });

    it('should prevent duplicate winner creation', async () => {
      // Arrange
      const eventId = 'event-123';
      const participant = { id: 'p1', name: 'Alice', eventId };

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue([participant]);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockWinnerService.isParticipantWinner.mockResolvedValue(true); // Already a winner
      mockRandomService.selectRandomParticipant.mockResolvedValue(participant);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Selected participant is already a winner');
      expect(mockWinnerService.createWinner).not.toHaveBeenCalled();
    });
  });

  describe('No Predefined Winner Limit', () => {
    it('should allow drawing all participants regardless of count', async () => {
      // Arrange - Large event with 100 participants
      const eventId = 'large-event-123';
      const participants = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Participant ${i + 1}`,
        eventId
      }));

      const mockEvent = {
        id: eventId,
        name: 'Large Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAllParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);

      // Track drawn participants for this test
      const drawnParticipantIds = new Set<string>();

      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(participants.filter(p => !drawnParticipantIds.has(p.id)));
      });

      // Mock sequential selection
      mockRandomService.selectRandomParticipant.mockImplementation((available) => {
        return Promise.resolve(available[0] || null);
      });

      mockWinnerService.createWinner.mockImplementation((data) => {
        drawnParticipantIds.add(data.participantId);
        return Promise.resolve({
          id: `winner-${data.drawOrder}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawAllRemaining(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.winners).toHaveLength(100);

      // Verify all participants were drawn
      const winnerParticipantIds = result.winners.map(w => w.participantId);
      const participantIds = participants.map(p => p.id);
      expect(winnerParticipantIds.sort()).toEqual(participantIds.sort());
    });

    it('should handle events with single participant', async () => {
      // Arrange
      const eventId = 'single-participant-event';
      const participant = { id: 'p1', name: 'Only Participant', eventId };

      const mockEvent = {
        id: eventId,
        name: 'Single Participant Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue([participant]);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockWinnerService.isParticipantWinner.mockResolvedValue(false);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participant);

      mockWinnerService.createWinner.mockResolvedValue({
        id: 'winner-1',
        eventId,
        participantId: 'p1',
        participantName: 'Only Participant',
        drawOrder: 1,
        drawnAt: new Date()
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.winner.participantName).toBe('Only Participant');
      expect(result.winner.drawOrder).toBe(1);
    });

    it('should support dynamic winner limit configuration', async () => {
      // Arrange
      const eventId = 'configurable-event';
      const participants = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Participant ${i + 1}`,
        eventId
      }));

      const mockEvent = {
        id: eventId,
        name: 'Configurable Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        maxWinners: 5 // Optional configuration
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);

      // Track drawn participants for this test
      const drawnParticipantIds = new Set<string>();

      mockParticipantService.getAvailableParticipants.mockImplementation(() => {
        return Promise.resolve(participants.filter(p => !drawnParticipantIds.has(p.id)));
      });

      mockWinnerService.isParticipantWinner.mockImplementation((eventId, participantId) =>
        Promise.resolve(drawnParticipantIds.has(participantId))
      );

      mockRandomService.selectRandomParticipant.mockImplementation((available) =>
        Promise.resolve(available[0] || null)
      );

      mockWinnerService.createWinner.mockImplementation((data) => {
        drawnParticipantIds.add(data.participantId);
        return Promise.resolve({
          id: `winner-${data.drawOrder}`,
          eventId: data.eventId,
          participantId: data.participantId,
          participantName: data.participantName,
          drawOrder: data.drawOrder,
          drawnAt: new Date()
        });
      });

      mockNotificationService.notifyWinner.mockResolvedValue(true);

      // Act
      const result = await lotteryService.drawWithLimit(eventId, 'admin-123', 5);

      // Assert
      expect(result.success).toBe(true);
      expect(result.winners).toHaveLength(5);
      expect(result.winners.every(w => w.drawOrder <= 5)).toBe(true);
    });
  });

  describe('Lottery Component Integration', () => {
    it('should render lottery interface with draw button', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        participantCount: 5,
        winnerCount: 0
      };

      // Act
      render(<LotteryComponent event={mockEvent} />);

      // Assert
      expect(screen.getByText('Test Event - Lottery Draw')).toBeInTheDocument();
      expect(screen.getByText('5 participants registered')).toBeInTheDocument();
      expect(screen.getByText('0 winners drawn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /draw winner/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /draw all/i })).toBeInTheDocument();
    });

    it('should disable draw buttons when no participants available', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        participantCount: 3,
        winnerCount: 3
      };

      // Act
      render(<LotteryComponent event={mockEvent} />);

      // Assert
      expect(screen.getByRole('button', { name: /draw winner/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /draw all/i })).toBeDisabled();
      expect(screen.getByText(/all participants have been drawn/i)).toBeInTheDocument();
    });

    it('should show real-time winner updates', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        participantCount: 3,
        winnerCount: 0
      };

      const onDrawWinner = jest.fn(() => Promise.resolve({
        success: true,
        winner: {
          id: 'winner-1',
          participantName: 'Alice',
          drawOrder: 1,
          drawnAt: new Date()
        }
      }));

      // Act
      render(<LotteryComponent event={mockEvent} onDrawWinner={onDrawWinner} />);

      const drawButton = screen.getByRole('button', { name: /draw winner/i });
      fireEvent.click(drawButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/winner: alice/i)).toBeInTheDocument();
        expect(screen.getByText(/position: 1/i)).toBeInTheDocument();
      });

      expect(onDrawWinner).toHaveBeenCalledWith('event-123');
    });

    it('should display winner list in draw order', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        participantCount: 5,
        winnerCount: 3
      };

      const existingWinners = [
        { id: 'w1', participantName: 'Charlie', drawOrder: 1 },
        { id: 'w2', participantName: 'Alice', drawOrder: 2 },
        { id: 'w3', participantName: 'Bob', drawOrder: 3 }
      ];

      // Act
      render(<LotteryComponent event={mockEvent} winners={existingWinners} />);

      // Assert
      const winnerItems = screen.getAllByTestId('winner-item');
      expect(winnerItems).toHaveLength(3);
      expect(winnerItems[0]).toHaveTextContent('1. Charlie');
      expect(winnerItems[1]).toHaveTextContent('2. Alice');
      expect(winnerItems[2]).toHaveTextContent('3. Bob');
    });

    it('should show confetti animation for winner announcement', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        participantCount: 3,
        winnerCount: 0
      };

      const onDrawWinner = jest.fn(() => Promise.resolve({
        success: true,
        winner: {
          id: 'winner-1',
          participantName: 'Alice',
          drawOrder: 1,
          drawnAt: new Date()
        }
      }));

      // Mock confetti function
      const mockConfetti = jest.fn();
      (global as any).confetti = mockConfetti;

      // Act
      render(<LotteryComponent event={mockEvent} onDrawWinner={onDrawWinner} />);

      const drawButton = screen.getByRole('button', { name: /draw winner/i });
      fireEvent.click(drawButton);

      // Assert
      await waitFor(() => {
        expect(mockConfetti).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid event state for drawing', async () => {
      // Arrange
      const eventId = 'event-123';
      const initEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(initEvent);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot draw winners - event is not in DRAW state');
    });

    it('should handle database errors during winner creation', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [{ id: 'p1', name: 'Alice', eventId }];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockResolvedValue(participants[0]);
      mockWinnerService.isParticipantWinner.mockResolvedValue(false);
      mockWinnerService.createWinner.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create winner record');
    });

    it('should handle random selection failures', async () => {
      // Arrange
      const eventId = 'event-123';
      const participants = [{ id: 'p1', name: 'Alice', eventId }];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.getAvailableParticipants.mockResolvedValue(participants);
      mockWinnerService.getWinnerCount.mockResolvedValue(0);
      mockRandomService.selectRandomParticipant.mockRejectedValue(new Error('Random selection failed'));

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, 'admin-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to select random winner');
    });

    it('should validate admin permissions before drawing', async () => {
      // Arrange
      const eventId = 'event-123';
      const wrongAdminId = 'wrong-admin';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        createdBy: 'correct-admin',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);

      // Act
      const result = await lotteryService.drawSingleWinner(eventId, wrongAdminId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Only event creator can draw winners');
    });
  });
});