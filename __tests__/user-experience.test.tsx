/**
 * User Experience Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserExperienceService } from '../lib/services/UserExperienceService';
import { SessionService } from '../lib/services/SessionService';
import { EventService } from '../lib/services/EventService';
import { ParticipantService } from '../lib/services/ParticipantService';
import { NotificationService } from '../lib/services/NotificationService';
import { UserStateManager } from '../lib/state/UserStateManager';
import { EventState } from '../lib/state/EventStateMachine';
import { UserScreen } from '../components/UserScreen';
import { RegistrationScreen } from '../components/RegistrationScreen';
import { WaitingScreen } from '../components/WaitingScreen';
import { LotteryScreen } from '../components/LotteryScreen';
import { ResultScreen } from '../components/ResultScreen';

// Mock services
const mockSessionService = {
  validateSession: jest.fn(),
  createUserSession: jest.fn(),
  extendSession: jest.fn(),
  invalidateSession: jest.fn(),
};

const mockEventService = {
  findById: jest.fn(),
  create: jest.fn(),
  updateState: jest.fn(),
  findAll: jest.fn(),
};

const mockParticipantService = {
  findById: jest.fn(),
  findByEventAndName: jest.fn(),
  create: jest.fn(),
  findByEventId: jest.fn(),
};

const mockNotificationService = {
  connectToLiveUpdates: jest.fn(),
  sendNotification: jest.fn(),
  subscribeToEvents: jest.fn(),
  disconnect: jest.fn(),
};

const mockUserStateManager = {
  determineUserState: jest.fn(),
  recoverUserState: jest.fn(),
  persistUserState: jest.fn(),
  clearUserState: jest.fn(),
  createDefaultState: jest.fn(),
  saveUserState: jest.fn(),
  loadUserState: jest.fn(),
  isStoredStateValid: jest.fn(),
};

describe('User Experience System', () => {
  let userExperienceService: UserExperienceService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize user experience service
    userExperienceService = new UserExperienceService(
      mockSessionService as any,
      mockEventService as any,
      mockParticipantService as any,
      mockNotificationService as any,
      mockUserStateManager as any,
    );

    // Setup default mock returns
    mockUserStateManager.createDefaultState.mockImplementation((eventId: string) => ({
      status: 'UNREGISTERED',
      screen: 'REGISTRATION',
      event: {
        id: eventId,
        name: 'Unknown Event',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false,
      },
    }));

    // Default mock behavior
    mockUserStateManager.loadUserState.mockReturnValue(null);
    mockUserStateManager.isStoredStateValid.mockReturnValue(true);

    // Mock browser localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User State Recovery After Browser Refresh', () => {
    it('should recover unregistered user state from localStorage', async () => {
      // Arrange
      const eventId = 'event-123';
      const storedState = {
        eventId,
        userStatus: 'UNREGISTERED',
        timestamp: Date.now(),
      };

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(storedState));
      mockEventService.findById.mockResolvedValue(mockEvent);
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'UNREGISTERED',
        screen: 'REGISTRATION',
        event: mockEvent,
      });

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userState.status).toBe('UNREGISTERED');
      expect(result.userState.screen).toBe('REGISTRATION');
      expect(result.userState.event).toEqual(mockEvent);
      expect(mockEventService.findById).toHaveBeenCalledWith(eventId);
    });

    it('should recover registered user state with session validation', async () => {
      // Arrange
      const eventId = 'event-123';
      const sessionId = 'session-456';
      const storedState = {
        eventId,
        sessionId,
        userStatus: 'REGISTERED',
        participantId: 'participant-789',
        timestamp: Date.now(),
      };

      const mockSession = {
        id: sessionId,
        participantId: 'participant-789',
        eventId,
        valid: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockParticipant = {
        id: 'participant-789',
        name: 'John Doe',
        eventId,
        registeredAt: new Date(),
      };

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
      };

      mockUserStateManager.loadUserState.mockReturnValue(storedState);
      mockSessionService.validateSession.mockResolvedValue(mockSession);
      mockParticipantService.findById.mockResolvedValue(mockParticipant);
      mockEventService.findById.mockResolvedValue(mockEvent);
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'REGISTERED',
        screen: 'WAITING',
        event: mockEvent,
        participant: mockParticipant,
        session: mockSession,
      });

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userState.status).toBe('REGISTERED');
      expect(result.userState.screen).toBe('WAITING');
      expect(result.userState.participant).toEqual(mockParticipant);
      expect(result.userState.session).toEqual(mockSession);
      expect(mockSessionService.validateSession).toHaveBeenCalledWith(sessionId);
    });

    it('should handle expired session recovery gracefully', async () => {
      // Arrange
      const eventId = 'event-123';
      const sessionId = 'expired-session';
      const storedState = {
        eventId,
        sessionId,
        userStatus: 'REGISTERED',
        participantId: 'participant-789',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      mockUserStateManager.loadUserState.mockReturnValue(storedState);
      mockSessionService.validateSession.mockResolvedValue(null); // Session expired
      mockEventService.findById.mockResolvedValue(mockEvent);
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'SESSION_EXPIRED',
        screen: 'REGISTRATION',
        event: mockEvent,
        message: 'Session expired. Please register again.',
        action: 'SHOW_REAUTH_FORM',
      });

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userState.status).toBe('SESSION_EXPIRED');
      expect(result.userState.screen).toBe('REGISTRATION');
      expect(result.userState.message).toContain('Session expired');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(`userState_${eventId}`);
    });

    it('should persist user state changes to localStorage', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantData = {
        id: 'participant-456',
        name: 'Jane Doe',
        eventId,
      };

      const sessionData = {
        id: 'session-789',
        participantId: 'participant-456',
        eventId,
      };

      const newUserState = {
        eventId,
        sessionId: 'session-789',
        userStatus: 'REGISTERED',
        participantId: 'participant-456',
        timestamp: Date.now(),
      };

      // Act
      await userExperienceService.saveUserState(eventId, {
        status: 'REGISTERED',
        participant: participantData,
        session: sessionData,
      });

      // Assert
      expect(mockUserStateManager.saveUserState).toHaveBeenCalledWith(eventId, {
        status: 'REGISTERED',
        participant: participantData,
        session: sessionData,
      });
    });

    it('should handle corrupted localStorage data', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      // Simulate corrupted localStorage data - loadUserState returns null due to parse error
      mockUserStateManager.loadUserState.mockReturnValue(null);
      mockEventService.findById.mockResolvedValue(mockEvent);
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'UNREGISTERED',
        screen: 'REGISTRATION',
        event: mockEvent,
      });

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.userState.status).toBe('UNREGISTERED');
      expect(result.userState.screen).toBe('REGISTRATION');
    });

    it('should maintain state across multiple page refreshes', async () => {
      // Arrange
      const eventId = 'event-123';
      const sessionId = 'persistent-session';
      const storedState = {
        eventId,
        sessionId,
        userStatus: 'REGISTERED',
        participantId: 'participant-123',
        timestamp: Date.now(),
      };

      const mockSession = {
        id: sessionId,
        participantId: 'participant-123',
        eventId,
        valid: true,
      };

      mockUserStateManager.loadUserState.mockReturnValue(storedState);
      mockSessionService.validateSession.mockResolvedValue(mockSession);
      mockEventService.findById.mockResolvedValue({
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
      });
      mockParticipantService.findById.mockResolvedValue({ id: 'participant-123', name: 'User' });
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'REGISTERED',
        screen: 'WAITING',
      });

      // Act - Simulate multiple recoveries (page refreshes)
      for (let i = 0; i < 5; i++) {
        const result = await userExperienceService.recoverUserState(eventId);
        expect(result.success).toBe(true);
        expect(result.userState.status).toBe('REGISTERED');
      }

      // Assert
      expect(mockSessionService.validateSession).toHaveBeenCalledTimes(5);
    });
  });

  describe('Correct Screen Display Based on User Status', () => {
    it('should show registration screen for unregistered users', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'UNREGISTERED',
        screen: 'REGISTRATION',
        event: mockEvent,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId);

      // Assert
      expect(result.screen).toBe('REGISTRATION');
      expect(result.component).toBe('RegistrationScreen');
      expect(result.props.event).toEqual(mockEvent);
    });

    it('should show waiting screen for registered users during draw', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
      };

      const mockParticipant = {
        id: 'participant-123',
        name: 'John Doe',
        eventId,
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'REGISTERED',
        screen: 'WAITING',
        event: mockEvent,
        participant: mockParticipant,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId, {
        participantId: 'participant-123',
      });

      // Assert
      expect(result.screen).toBe('WAITING');
      expect(result.component).toBe('WaitingScreen');
      expect(result.props.event).toEqual(mockEvent);
      expect(result.props.participant).toEqual(mockParticipant);
    });

    it('should show lottery screen for active draw with live updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
        isLive: true,
      };

      const mockParticipant = {
        id: 'participant-123',
        name: 'John Doe',
        eventId,
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'REGISTERED',
        screen: 'LOTTERY_LIVE',
        event: mockEvent,
        participant: mockParticipant,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId, {
        participantId: 'participant-123',
        liveDrawActive: true,
      });

      // Assert
      expect(result.screen).toBe('LOTTERY_LIVE');
      expect(result.component).toBe('LotteryScreen');
      expect(result.props.isLive).toBe(true);
      expect(result.props.participant).toEqual(mockParticipant);
    });

    it('should show winner screen for selected participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.CLOSED,
        registrationOpen: false,
        closed: true,
      };

      const mockParticipant = {
        id: 'participant-123',
        name: 'John Doe',
        eventId,
      };

      const mockWinner = {
        id: 'winner-123',
        participantId: 'participant-123',
        participantName: 'John Doe',
        drawOrder: 3,
        drawnAt: new Date(),
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'WINNER',
        screen: 'WINNER_RESULT',
        event: mockEvent,
        participant: mockParticipant,
        winner: mockWinner,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId, {
        participantId: 'participant-123',
      });

      // Assert
      expect(result.screen).toBe('WINNER_RESULT');
      expect(result.component).toBe('ResultScreen');
      expect(result.props.isWinner).toBe(true);
      expect(result.props.winner).toEqual(mockWinner);
      expect(result.props.drawOrder).toBe(3);
    });

    it('should show non-winner screen for unselected participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.CLOSED,
        registrationOpen: false,
        closed: true,
      };

      const mockParticipant = {
        id: 'participant-456',
        name: 'Jane Doe',
        eventId,
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'NOT_WINNER',
        screen: 'NOT_WINNER_RESULT',
        event: mockEvent,
        participant: mockParticipant,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId, {
        participantId: 'participant-456',
      });

      // Assert
      expect(result.screen).toBe('NOT_WINNER_RESULT');
      expect(result.component).toBe('ResultScreen');
      expect(result.props.isWinner).toBe(false);
      expect(result.props.participant).toEqual(mockParticipant);
    });

    it('should show error screen for invalid event states', async () => {
      // Arrange
      const eventId = 'nonexistent-event';

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'ERROR',
        screen: 'ERROR',
        error: 'Event not found',
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId);

      // Assert
      expect(result.screen).toBe('ERROR');
      expect(result.component).toBe('ErrorScreen');
      expect(result.props.error).toBe('Event not found');
    });

    it('should show closed event screen for closed events', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Closed Event',
        state: EventState.CLOSED,
        registrationOpen: false,
        closed: true,
      };

      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'EVENT_CLOSED',
        screen: 'EVENT_CLOSED',
        event: mockEvent,
      });

      // Act
      const result = await userExperienceService.determineUserScreen(eventId);

      // Assert
      expect(result.screen).toBe('EVENT_CLOSED');
      expect(result.component).toBe('ClosedEventScreen');
      expect(result.props.event).toEqual(mockEvent);
    });
  });

  describe('Real-time Updates During Lottery', () => {
    it('should establish WebSocket connection for live lottery updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        onmessage: jest.fn(),
        onopen: jest.fn(),
        onerror: jest.fn(),
        readyState: 1, // WebSocket.OPEN
      };

      (global as any).WebSocket = jest.fn().mockImplementation(() => mockWebSocket);
      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      // Act
      const connection = await userExperienceService.connectToLiveUpdates(eventId, participantId);

      // Assert
      expect(connection.connected).toBe(true);
      expect(connection.socket).toBe(mockWebSocket);
      expect(mockNotificationService.connectToLiveUpdates).toHaveBeenCalledWith(
        eventId,
        participantId,
      );
    });

    it('should handle winner announcement updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        onmessage: null,
        onopen: null,
        onerror: null,
        readyState: 1, // WebSocket.OPEN
      };

      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      const winnerUpdate = {
        type: 'WINNER_ANNOUNCED',
        winner: {
          participantId: 'participant-123',
          participantName: 'Alice',
          drawOrder: 1,
        },
        timestamp: new Date(),
      };

      const updateHandler = jest.fn();

      // Act
      const connection = await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onWinnerUpdate: updateHandler,
      });

      // Simulate receiving winner update
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(winnerUpdate),
        } as MessageEvent);
      }

      // Assert
      expect(updateHandler).toHaveBeenCalledWith(winnerUpdate.winner);
    });

    it('should update participant count in real-time', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        onmessage: null,
        readyState: 1, // WebSocket.OPEN
      };

      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      const participantUpdate = {
        type: 'PARTICIPANT_COUNT_UPDATE',
        totalParticipants: 25,
        remainingParticipants: 20,
        timestamp: new Date(),
      };

      const countUpdateHandler = jest.fn();

      // Act
      await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onParticipantCountUpdate: countUpdateHandler,
      });

      // Simulate receiving participant count update
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(participantUpdate),
        } as MessageEvent);
      }

      // Assert
      expect(countUpdateHandler).toHaveBeenCalledWith({
        total: 25,
        remaining: 20,
      });
    });

    it('should handle personal winner notifications', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        onmessage: null,
        readyState: 1, // WebSocket.OPEN
      };

      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      const personalWinUpdate = {
        type: 'YOU_ARE_WINNER',
        winner: {
          participantId: 'participant-456',
          participantName: 'John Doe',
          drawOrder: 5,
        },
        congratulationsMessage: 'Congratulations! You have been selected!',
        timestamp: new Date(),
      };

      const winnerHandler = jest.fn();

      // Act
      await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onPersonalWinnerNotification: winnerHandler,
      });

      // Simulate receiving personal winner notification
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(personalWinUpdate),
        } as MessageEvent);
      }

      // Assert
      expect(winnerHandler).toHaveBeenCalledWith({
        drawOrder: 5,
        message: 'Congratulations! You have been selected!',
      });
    });

    it('should handle draw completion notifications', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        onmessage: null,
        readyState: 1, // WebSocket.OPEN
      };

      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      const drawCompleteUpdate = {
        type: 'DRAW_COMPLETED',
        totalWinners: 10,
        eventClosed: true,
        finalResults: true,
        timestamp: new Date(),
      };

      const completionHandler = jest.fn();

      // Act
      await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onDrawCompletion: completionHandler,
      });

      // Simulate receiving draw completion
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(drawCompleteUpdate),
        } as MessageEvent);
      }

      // Assert
      expect(completionHandler).toHaveBeenCalledWith({
        totalWinners: 10,
        eventClosed: true,
      });
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      mockNotificationService.connectToLiveUpdates.mockRejectedValue(
        new Error('WebSocket connection failed'),
      );

      const errorHandler = jest.fn();

      // Act
      const connection = await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onConnectionError: errorHandler,
      });

      // Assert
      expect(connection.connected).toBe(false);
      expect(connection.error).toBe('WebSocket connection failed');
      expect(errorHandler).toHaveBeenCalledWith('WebSocket connection failed');
    });

    it('should implement automatic reconnection on connection loss', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      let connectionAttempts = 0;
      mockNotificationService.connectToLiveUpdates.mockImplementation(() => {
        connectionAttempts++;
        if (connectionAttempts <= 2) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve({
          onmessage: null,
          readyState: 1, // WebSocket.OPEN
        });
      });

      const reconnectionHandler = jest.fn();

      // Act
      const connection = await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onReconnection: reconnectionHandler,
        autoReconnect: true,
        maxReconnectAttempts: 3,
      });

      // Assert
      expect(connection.connected).toBe(true);
      expect(reconnectionHandler).toHaveBeenCalledWith({ attempt: 3, success: true });
      expect(connectionAttempts).toBe(3);
    });
  });

  describe('Post-Lottery Winner/Non-Winner Screens', () => {
    it('should display winner celebration screen with confetti', async () => {
      // Arrange
      const mockWinner = {
        id: 'winner-123',
        participantName: 'John Doe',
        drawOrder: 1,
        drawnAt: new Date(),
        eventName: 'Test Event',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.CLOSED,
        closed: true,
      };

      // Mock confetti library
      const mockConfetti = jest.fn();
      (global as any).confetti = mockConfetti;

      // Act
      render(
        <ResultScreen isWinner={true} winner={mockWinner} event={mockEvent} showConfetti={true} />,
      );

      // Assert
      expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/position.*1/i)).toBeInTheDocument();
      expect(screen.getByText(/test event/i)).toBeInTheDocument();
      expect(mockConfetti).toHaveBeenCalled();
    });

    it('should display winner screen with share functionality', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockWinner = {
        id: 'winner-123',
        participantName: 'Jane Doe',
        drawOrder: 3,
        drawnAt: new Date(),
        eventName: 'Amazing Contest',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Amazing Contest',
        state: EventState.CLOSED,
        closed: true,
      };

      const shareHandler = jest.fn();

      // Act
      render(
        <ResultScreen
          isWinner={true}
          winner={mockWinner}
          event={mockEvent}
          onShare={shareHandler}
        />,
      );

      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);

      // Assert
      expect(shareHandler).toHaveBeenCalledWith({
        type: 'WINNER',
        participantName: 'Jane Doe',
        eventName: 'Amazing Contest',
        drawOrder: 3,
      });
    });

    it('should display non-winner consolation screen', async () => {
      // Arrange
      const mockParticipant = {
        id: 'participant-456',
        name: 'Bob Smith',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.CLOSED,
        closed: true,
      };

      const eventStats = {
        totalParticipants: 100,
        totalWinners: 10,
      };

      // Act
      render(
        <ResultScreen
          isWinner={false}
          participant={mockParticipant}
          event={mockEvent}
          eventStats={eventStats}
        />,
      );

      // Assert
      expect(screen.getByText(/thank you for participating/i)).toBeInTheDocument();
      expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
      expect(screen.getByText(/100.*participants/i)).toBeInTheDocument();
      expect(screen.getByText(/10.*winners/i)).toBeInTheDocument();
      expect(screen.queryByText(/congratulations/i)).not.toBeInTheDocument();
    });

    it('should show winner details with draw timestamp', async () => {
      // Arrange
      const drawTime = new Date('2024-01-15T14:30:00Z');
      const mockWinner = {
        id: 'winner-123',
        participantName: 'Alice Johnson',
        drawOrder: 5,
        drawnAt: drawTime,
        eventName: 'Lucky Draw 2024',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Lucky Draw 2024',
        state: EventState.CLOSED,
        closed: true,
      };

      // Act
      render(
        <ResultScreen isWinner={true} winner={mockWinner} event={mockEvent} showTimestamp={true} />,
      );

      // Assert
      expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/position.*5/i)).toBeInTheDocument();
      expect(screen.getByText(/january 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/2:30 PM/i)).toBeInTheDocument();
    });

    it('should provide navigation back to event list', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockParticipant = {
        id: 'participant-456',
        name: 'Charlie Brown',
        eventId: 'event-123',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.CLOSED,
        closed: true,
      };

      const navigationHandler = jest.fn();

      // Act
      render(
        <ResultScreen
          isWinner={false}
          participant={mockParticipant}
          event={mockEvent}
          onNavigateBack={navigationHandler}
        />,
      );

      const backButton = screen.getByRole('button', { name: /back to events/i });
      await user.click(backButton);

      // Assert
      expect(navigationHandler).toHaveBeenCalledWith('/events');
    });

    it('should display lottery statistics on result screen', async () => {
      // Arrange
      const mockWinner = {
        id: 'winner-123',
        participantName: 'Diana Prince',
        drawOrder: 2,
        drawnAt: new Date(),
        eventName: 'Superhero Contest',
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Superhero Contest',
        state: EventState.CLOSED,
        closed: true,
      };

      const lotteryStats = {
        totalParticipants: 50,
        totalWinners: 5,
        yourOdds: '10%',
        drawDuration: '15 minutes',
      };

      // Act
      render(
        <ResultScreen
          isWinner={true}
          winner={mockWinner}
          event={mockEvent}
          stats={lotteryStats}
          showStats={true}
        />,
      );

      // Assert
      expect(screen.getByText(/50.*participants/i)).toBeInTheDocument();
      expect(screen.getByText(/5.*winners/i)).toBeInTheDocument();
      expect(screen.getByText(/10%.*odds/i)).toBeInTheDocument();
      expect(screen.getByText(/15 minutes/i)).toBeInTheDocument();
    });

    it('should handle result screen loading states', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.CLOSED,
        closed: true,
      };

      // Act
      render(
        <ResultScreen event={mockEvent} loading={true} loadingMessage="Checking your result..." />,
      );

      // Assert
      expect(screen.getByText(/checking your result/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display different messages based on draw position', async () => {
      // Test different winner positions
      const positions = [
        { order: 1, message: /first place/i },
        { order: 2, message: /second place/i },
        { order: 3, message: /third place/i },
        { order: 10, message: /10th place/i },
      ];

      for (const position of positions) {
        const mockWinner = {
          id: 'winner-123',
          participantName: 'Test Winner',
          drawOrder: position.order,
          drawnAt: new Date(),
          eventName: 'Test Event',
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          state: EventState.CLOSED,
          closed: true,
        };

        // Act
        const { unmount } = render(
          <ResultScreen
            isWinner={true}
            winner={mockWinner}
            event={mockEvent}
            showPosition={true}
          />,
        );

        // Assert
        expect(screen.getByText(position.message)).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('User Screen Component Integration', () => {
    it('should render registration screen with QR code scanner', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      // Act
      render(<RegistrationScreen event={mockEvent} enableQRScanner={true} />);

      // Assert
      expect(screen.getByText('Register for Test Event')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      expect(screen.getByText(/scan qr code/i)).toBeInTheDocument();
    });

    it('should render waiting screen with live participant count', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      const mockParticipant = {
        id: 'participant-123',
        name: 'John Doe',
        eventId: 'event-123',
      };

      // Act
      render(
        <WaitingScreen
          event={mockEvent}
          participant={mockParticipant}
          participantCount={25}
          liveUpdates={true}
        />,
      );

      // Assert
      expect(screen.getByText('Welcome, John Doe')).toBeInTheDocument();
      expect(screen.getByText(/25.*participants/i)).toBeInTheDocument();
      expect(screen.getByText(/waiting for draw/i)).toBeInTheDocument();
      expect(screen.getByText(/you will be notified/i)).toBeInTheDocument();
    });

    it('should render lottery screen with animation', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false,
      };

      const currentWinners = [
        { id: 'w1', participantName: 'Alice', drawOrder: 1 },
        { id: 'w2', participantName: 'Bob', drawOrder: 2 },
      ];

      // Act
      render(
        <LotteryScreen
          event={mockEvent}
          isLive={true}
          currentWinners={currentWinners}
          showAnimation={true}
        />,
      );

      // Assert
      expect(screen.getByText('Live Draw - Test Event')).toBeInTheDocument();
      expect(screen.getByText(/current winners/i)).toBeInTheDocument();
      expect(screen.getByText('1. Alice')).toBeInTheDocument();
      expect(screen.getByText('2. Bob')).toBeInTheDocument();
      expect(screen.getByTestId('lottery-animation')).toBeInTheDocument();
    });

    it('should handle screen transitions smoothly', async () => {
      // Arrange
      const initialEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      const onStateChange = jest.fn();

      // Act
      const { rerender } = render(
        <UserScreen
          event={initialEvent}
          userState={{ status: 'UNREGISTERED', screen: 'REGISTRATION' }}
          onStateChange={onStateChange}
        />,
      );

      // Simulate state change to waiting
      const updatedEvent = {
        ...initialEvent,
        state: EventState.DRAW,
        registrationOpen: false,
      };

      rerender(
        <UserScreen
          event={updatedEvent}
          userState={{ status: 'REGISTERED', screen: 'WAITING' }}
          onStateChange={onStateChange}
        />,
      );

      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/register/i)).not.toBeInTheDocument();
        expect(screen.getByText(/waiting/i)).toBeInTheDocument();
      });
    });

    it('should provide accessibility features for all screens', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Accessible Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      // Act
      render(<RegistrationScreen event={mockEvent} accessibilityMode={true} />);

      // Assert
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Registration Form');
      expect(screen.getByLabelText(/name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /register/i })).toHaveAttribute('aria-describedby');
      expect(screen.getByText(/accessible/i)).toHaveAttribute('role', 'heading');
    });

    it('should handle offline mode gracefully', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Act
      render(<RegistrationScreen event={mockEvent} />);

      // Assert
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      expect(screen.getByText(/connection restored/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle state recovery failures gracefully', async () => {
      // Arrange
      const eventId = 'event-123';

      mockEventService.findById.mockRejectedValue(new Error('Event service unavailable'));

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to recover user state');
      expect(result.fallbackState).toEqual({
        status: 'ERROR',
        screen: 'ERROR',
        message: 'Unable to connect to event service',
      });
    });

    it('should handle WebSocket disconnections during live updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const participantId = 'participant-456';

      const mockWebSocket = {
        close: jest.fn(),
        onclose: null,
        onerror: null,
        readyState: 1, // WebSocket.OPEN initially
      };

      mockNotificationService.connectToLiveUpdates.mockResolvedValue(mockWebSocket);

      const disconnectionHandler = jest.fn();

      // Act
      await userExperienceService.connectToLiveUpdates(eventId, participantId, {
        onDisconnection: disconnectionHandler,
      });

      // Simulate disconnection
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1006, reason: 'Connection lost' } as CloseEvent);
      }

      // Assert
      expect(disconnectionHandler).toHaveBeenCalledWith({
        code: 1006,
        reason: 'Connection lost',
        reconnecting: true,
      });
    });

    it('should provide fallback UI for unsupported browsers', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
      };

      // Mock unsupported browser (no WebSocket)
      (global as any).WebSocket = undefined;

      // Act
      render(<UserScreen event={mockEvent} />);

      // Assert
      expect(screen.getByText(/browser compatibility/i)).toBeInTheDocument();
      expect(screen.getByText(/limited features/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('should handle session timeout errors', async () => {
      // Arrange
      const eventId = 'event-123';
      const expiredSessionId = 'expired-session';

      mockSessionService.validateSession.mockResolvedValue(null);
      mockEventService.findById.mockResolvedValue({
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
      });
      mockUserStateManager.determineUserState.mockResolvedValue({
        status: 'SESSION_EXPIRED',
        screen: 'REGISTRATION',
        message: 'Your session has expired. Please register again.',
        action: 'SHOW_REAUTH_FORM',
      });

      // Act
      const result = await userExperienceService.recoverUserState(eventId, {
        sessionId: expiredSessionId,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.userState.status).toBe('SESSION_EXPIRED');
      expect(result.userState.message).toContain('session has expired');
      expect(result.userState.action).toBe('SHOW_REAUTH_FORM');
    });

    it('should handle network connectivity issues', async () => {
      // Arrange
      const eventId = 'event-123';

      mockEventService.findById.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await userExperienceService.recoverUserState(eventId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to recover user state');
      expect(result.networkError).toBe(true);
      expect(result.retryable).toBe(true);
    });
  });
});
