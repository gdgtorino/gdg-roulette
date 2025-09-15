/**
 * Event State Machine Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventStateMachine, EventState } from '../lib/state/EventStateMachine';
import { EventService } from '../lib/services/EventService';
import { EventRepository } from '../lib/repositories/EventRepository';
import { ParticipantService } from '../lib/services/ParticipantService';
import { LotteryService } from '../lib/services/LotteryService';

// Mock dependencies
jest.mock('../lib/repositories/EventRepository');
jest.mock('../lib/services/ParticipantService');
jest.mock('../lib/services/LotteryService');

describe('Event State Machine', () => {
  let eventStateMachine: EventStateMachine;
  let eventService: EventService;
  let eventRepository: jest.Mocked<EventRepository>;
  let participantService: jest.Mocked<ParticipantService>;
  let lotteryService: jest.Mocked<LotteryService>;
  let mockEvent: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    eventRepository = new EventRepository() as jest.Mocked<EventRepository>;
    participantService = new ParticipantService() as jest.Mocked<ParticipantService>;
    lotteryService = new LotteryService() as jest.Mocked<LotteryService>;

    // Initialize services
    eventService = new EventService(eventRepository, participantService);
    eventStateMachine = new EventStateMachine(eventService, lotteryService);

    // Initialize shared mock event
    mockEvent = {
      id: 'event-123',
      name: 'Test Event',
      createdBy: 'admin-123',
      state: EventState.INIT,
      registrationOpen: false,
      closed: false,
      qrCode: 'qr-code-data',
      createdAt: new Date(),
      participants: [],
      winners: []
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Event Creation', () => {
    it('should create event in INIT state', async () => {
      // Arrange
      const eventData = {
        name: 'Test Event',
        createdBy: 'admin-123'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        createdBy: 'admin-123',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false,
        qrCode: 'qr-code-data',
        createdAt: new Date(),
        participants: [],
        winners: []
      };

      eventRepository.create.mockResolvedValue(mockEvent);

      // Act
      const result = await eventStateMachine.createEvent(eventData);

      // Assert
      expect(result.state).toBe(EventState.INIT);
      expect(result.registrationOpen).toBe(false);
      expect(result.closed).toBe(false);
      expect(eventRepository.create).toHaveBeenCalledWith({
        name: 'Test Event',
        createdBy: 'admin-123',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false
      });
    });

    it('should generate QR code during event creation', async () => {
      // Arrange
      const eventData = {
        name: 'QR Code Event',
        createdBy: 'admin-123'
      };

      const mockEvent = {
        id: 'event-456',
        name: 'QR Code Event',
        createdBy: 'admin-123',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false,
        qrCode: 'generated-qr-code-data',
        createdAt: new Date(),
        participants: [],
        winners: []
      };

      eventRepository.create.mockResolvedValue(mockEvent);

      // Act
      const result = await eventStateMachine.createEvent(eventData);

      // Assert
      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toBe('generated-qr-code-data');
    });

    it('should require admin permission to create event', async () => {
      // Arrange
      const eventData = {
        name: 'Unauthorized Event',
        createdBy: ''
      };

      // Act & Assert
      await expect(eventStateMachine.createEvent(eventData))
        .rejects.toThrow('Admin ID is required to create event');
    });
  });

  describe('State Transitions', () => {

    describe('INIT → REGISTRATION Transition', () => {
      it('should transition from INIT to REGISTRATION state', async () => {
        // Arrange
        eventRepository.findById.mockResolvedValue(mockEvent);
        eventRepository.update.mockResolvedValue({
          ...mockEvent,
          state: EventState.REGISTRATION,
          registrationOpen: true
        });

        // Act
        const result = await eventStateMachine.openRegistration('event-123', 'admin-123');

        // Assert
        expect(result.state).toBe(EventState.REGISTRATION);
        expect(result.registrationOpen).toBe(true);
        expect(eventRepository.update).toHaveBeenCalledWith('event-123', {
          state: EventState.REGISTRATION,
          registrationOpen: true
        });
      });

      it('should prevent opening registration from non-INIT state', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION
        };
        eventRepository.findById.mockResolvedValue(registrationEvent);

        // Act & Assert
        await expect(eventStateMachine.openRegistration('event-123', 'admin-123'))
          .rejects.toThrow('Can only open registration from INIT state');
      });

      it('should verify admin ownership before state transition', async () => {
        // Arrange
        eventRepository.findById.mockResolvedValue(mockEvent);

        // Act & Assert
        await expect(eventStateMachine.openRegistration('event-123', 'wrong-admin'))
          .rejects.toThrow('Only event creator can modify event state');
      });
    });

    describe('REGISTRATION → DRAW Transition', () => {
      it('should transition from REGISTRATION to DRAW state', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION,
          registrationOpen: true
        };

        eventRepository.findById.mockResolvedValue(registrationEvent);
        participantService.getParticipantCount.mockResolvedValue(5);
        eventRepository.update.mockResolvedValue({
          ...registrationEvent,
          state: EventState.DRAW,
          registrationOpen: false
        });

        // Act
        const result = await eventStateMachine.startDraw('event-123', 'admin-123');

        // Assert
        expect(result.state).toBe(EventState.DRAW);
        expect(result.registrationOpen).toBe(false);
        expect(eventRepository.update).toHaveBeenCalledWith('event-123', {
          state: EventState.DRAW,
          registrationOpen: false
        });
      });

      it('should prevent draw without participants', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION,
          registrationOpen: true
        };

        eventRepository.findById.mockResolvedValue(registrationEvent);
        participantService.getParticipantCount.mockResolvedValue(0);

        // Act & Assert
        await expect(eventStateMachine.startDraw('event-123', 'admin-123'))
          .rejects.toThrow('Cannot start draw without participants');
      });

      it('should prevent starting draw from invalid state', async () => {
        // Arrange
        const initEvent = {
          ...mockEvent,
          state: EventState.INIT
        };
        eventRepository.findById.mockResolvedValue(initEvent);

        // Act & Assert
        await expect(eventStateMachine.startDraw('event-123', 'admin-123'))
          .rejects.toThrow('Can only start draw from REGISTRATION state');
      });
    });

    describe('DRAW → CLOSED Transition', () => {
      it('should transition from DRAW to CLOSED state', async () => {
        // Arrange
        const drawEvent = {
          ...mockEvent,
          state: EventState.DRAW,
          registrationOpen: false
        };

        eventRepository.findById.mockResolvedValue(drawEvent);
        eventRepository.update.mockResolvedValue({
          ...drawEvent,
          state: EventState.CLOSED,
          closed: true
        });

        // Act
        const result = await eventStateMachine.closeEvent('event-123', 'admin-123');

        // Assert
        expect(result.state).toBe(EventState.CLOSED);
        expect(result.closed).toBe(true);
        expect(eventRepository.update).toHaveBeenCalledWith('event-123', {
          state: EventState.CLOSED,
          closed: true
        });
      });

      it('should automatically close event when all participants drawn', async () => {
        // Arrange
        const drawEvent = {
          ...mockEvent,
          state: EventState.DRAW,
          registrationOpen: false,
          participants: [
            { id: 'p1', name: 'User 1' },
            { id: 'p2', name: 'User 2' }
          ],
          winners: [
            { id: 'w1', participantId: 'p1', drawOrder: 1 },
            { id: 'w2', participantId: 'p2', drawOrder: 2 }
          ]
        };

        eventRepository.findById.mockResolvedValue(drawEvent);
        participantService.getParticipantCount.mockResolvedValue(2);
        lotteryService.getWinnerCount.mockResolvedValue(2);
        eventRepository.update.mockResolvedValue({
          ...drawEvent,
          state: EventState.CLOSED,
          closed: true
        });

        // Act
        const result = await eventStateMachine.checkAutoClose('event-123');

        // Assert
        expect(result.state).toBe(EventState.CLOSED);
        expect(result.closed).toBe(true);
      });

      it('should prevent manual close from invalid state', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION
        };
        eventRepository.findById.mockResolvedValue(registrationEvent);

        // Act & Assert
        await expect(eventStateMachine.closeEvent('event-123', 'admin-123'))
          .rejects.toThrow('Can only close event from DRAW state');
      });
    });

    describe('Invalid State Transitions', () => {
      it('should prevent INIT → DRAW transition', async () => {
        // Arrange
        eventRepository.findById.mockResolvedValue(mockEvent);

        // Act & Assert
        await expect(eventStateMachine.startDraw('event-123', 'admin-123'))
          .rejects.toThrow('Can only start draw from REGISTRATION state');
      });

      it('should prevent INIT → CLOSED transition', async () => {
        // Arrange
        eventRepository.findById.mockResolvedValue(mockEvent);

        // Act & Assert
        await expect(eventStateMachine.closeEvent('event-123', 'admin-123'))
          .rejects.toThrow('Can only close event from DRAW state');
      });

      it('should prevent REGISTRATION → CLOSED transition', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION
        };
        eventRepository.findById.mockResolvedValue(registrationEvent);

        // Act & Assert
        await expect(eventStateMachine.closeEvent('event-123', 'admin-123'))
          .rejects.toThrow('Can only close event from DRAW state');
      });

      it('should prevent reverse transitions', async () => {
        // Arrange - Event in DRAW state
        const drawEvent = {
          ...mockEvent,
          state: EventState.DRAW
        };
        eventRepository.findById.mockResolvedValue(drawEvent);

        // Act & Assert - Try to go back to REGISTRATION
        await expect(eventStateMachine.openRegistration('event-123', 'admin-123'))
          .rejects.toThrow('Can only open registration from INIT state');
      });

      it('should prevent modifications to closed events', async () => {
        // Arrange
        const closedEvent = {
          ...mockEvent,
          state: EventState.CLOSED,
          closed: true
        };
        eventRepository.findById.mockResolvedValue(closedEvent);

        // Act & Assert
        await expect(eventStateMachine.openRegistration('event-123', 'admin-123'))
          .rejects.toThrow('Cannot modify closed event');

        await expect(eventStateMachine.startDraw('event-123', 'admin-123'))
          .rejects.toThrow('Cannot modify closed event');
      });
    });
  });

  describe('State-Specific Business Rules', () => {
    describe('INIT State Rules', () => {
      it('should block participant registration in INIT state', async () => {
        // Arrange
        const initEvent = {
          id: 'event-123',
          state: EventState.INIT,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canRegisterParticipants(initEvent)).toBe(false);
      });

      it('should block draw operations in INIT state', async () => {
        // Arrange
        const initEvent = {
          id: 'event-123',
          state: EventState.INIT,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canPerformDraw(initEvent)).toBe(false);
      });
    });

    describe('REGISTRATION State Rules', () => {
      it('should allow participant registration in REGISTRATION state', async () => {
        // Arrange
        const registrationEvent = {
          id: 'event-123',
          state: EventState.REGISTRATION,
          registrationOpen: true
        };

        // Act & Assert
        expect(eventStateMachine.canRegisterParticipants(registrationEvent)).toBe(true);
      });

      it('should block draw operations in REGISTRATION state', async () => {
        // Arrange
        const registrationEvent = {
          id: 'event-123',
          state: EventState.REGISTRATION,
          registrationOpen: true
        };

        // Act & Assert
        expect(eventStateMachine.canPerformDraw(registrationEvent)).toBe(false);
      });

      it('should allow closing registration manually', async () => {
        // Arrange
        const registrationEvent = {
          ...mockEvent,
          state: EventState.REGISTRATION,
          registrationOpen: true
        };

        eventRepository.findById.mockResolvedValue(registrationEvent);
        eventRepository.update.mockResolvedValue({
          ...registrationEvent,
          registrationOpen: false
        });

        // Act
        const result = await eventStateMachine.closeRegistration('event-123', 'admin-123');

        // Assert
        expect(result.registrationOpen).toBe(false);
        expect(result.state).toBe(EventState.REGISTRATION); // State remains the same
      });
    });

    describe('DRAW State Rules', () => {
      it('should block participant registration in DRAW state', async () => {
        // Arrange
        const drawEvent = {
          id: 'event-123',
          state: EventState.DRAW,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canRegisterParticipants(drawEvent)).toBe(false);
      });

      it('should allow draw operations in DRAW state', async () => {
        // Arrange
        const drawEvent = {
          id: 'event-123',
          state: EventState.DRAW,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canPerformDraw(drawEvent)).toBe(true);
      });
    });

    describe('CLOSED State Rules', () => {
      it('should block all modifications in CLOSED state', async () => {
        // Arrange
        const closedEvent = {
          id: 'event-123',
          state: EventState.CLOSED,
          closed: true,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canRegisterParticipants(closedEvent)).toBe(false);
        expect(eventStateMachine.canPerformDraw(closedEvent)).toBe(false);
        expect(eventStateMachine.canModifyEvent(closedEvent)).toBe(false);
      });

      it('should allow read-only operations in CLOSED state', async () => {
        // Arrange
        const closedEvent = {
          id: 'event-123',
          state: EventState.CLOSED,
          closed: true,
          registrationOpen: false
        };

        // Act & Assert
        expect(eventStateMachine.canViewResults(closedEvent)).toBe(true);
        expect(eventStateMachine.canExportData(closedEvent)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle event not found error', async () => {
      // Arrange
      eventRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(eventStateMachine.openRegistration('nonexistent-event', 'admin-123'))
        .rejects.toThrow('Event not found');
    });

    it('should handle database errors during state transition', async () => {
      // Arrange
      eventRepository.findById.mockResolvedValue(mockEvent);
      eventRepository.update.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(eventStateMachine.openRegistration('event-123', 'admin-123'))
        .rejects.toThrow('Database connection failed');
    });

    it('should rollback state on transition failure', async () => {
      // Arrange
      const registrationEvent = {
        ...mockEvent,
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      eventRepository.findById.mockResolvedValue(registrationEvent);
      participantService.getParticipantCount.mockResolvedValue(5);
      eventRepository.update.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(eventStateMachine.startDraw('event-123', 'admin-123'))
        .rejects.toThrow('Update failed');

      // Verify state wasn't changed
      const currentEvent = await eventRepository.findById('event-123');
      expect(currentEvent.state).toBe(EventState.REGISTRATION);
    });
  });

  describe('State Machine Integrity', () => {
    it('should maintain state consistency across operations', async () => {
      // Arrange
      let currentEvent = {
        ...mockEvent,
        state: EventState.INIT
      };

      eventRepository.findById.mockImplementation(() => Promise.resolve(currentEvent));
      eventRepository.update.mockImplementation((id, updates) => {
        currentEvent = { ...currentEvent, ...updates };
        return Promise.resolve(currentEvent);
      });
      participantService.getParticipantCount.mockResolvedValue(3);

      // Act - Full workflow
      const step1 = await eventStateMachine.openRegistration('event-123', 'admin-123');
      const step2 = await eventStateMachine.startDraw('event-123', 'admin-123');
      const step3 = await eventStateMachine.closeEvent('event-123', 'admin-123');

      // Assert
      expect(step1.state).toBe(EventState.REGISTRATION);
      expect(step1.registrationOpen).toBe(true);

      expect(step2.state).toBe(EventState.DRAW);
      expect(step2.registrationOpen).toBe(false);

      expect(step3.state).toBe(EventState.CLOSED);
      expect(step3.closed).toBe(true);
    });

    it('should validate state before each operation', async () => {
      // Arrange
      const invalidEvent = {
        ...mockEvent,
        state: 'INVALID_STATE' as EventState
      };

      eventRepository.findById.mockResolvedValue(invalidEvent);

      // Act & Assert
      await expect(eventStateMachine.openRegistration('event-123', 'admin-123'))
        .rejects.toThrow('Invalid event state');
    });
  });
});