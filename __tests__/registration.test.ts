/**
 * User Registration Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationService } from '../lib/services/RegistrationService';
import { ParticipantService } from '../lib/services/ParticipantService';
import { EventService } from '../lib/services/EventService';
import { SessionService } from '../lib/services/SessionService';
import { QRCodeService } from '../lib/services/QRCodeService';
import { EventState } from '../lib/state/EventStateMachine';
import { RegistrationForm } from '../components/RegistrationForm';

// Mock services
const mockParticipantService = {
  findByEventAndName: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByEventId: jest.fn(),
  delete: jest.fn()
};

const mockEventService = {
  findById: jest.fn(),
  create: jest.fn(),
  updateState: jest.fn(),
  findAll: jest.fn()
};

const mockSessionService = {
  createUserSession: jest.fn(),
  validateUserSession: jest.fn(),
  extendSession: jest.fn(),
  invalidateSession: jest.fn()
};

const mockQRCodeService = {
  generateRegistrationUrl: jest.fn(),
  generateQRCode: jest.fn()
};

describe('User Registration System', () => {
  let registrationService: RegistrationService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize registration service with mocked dependencies
    registrationService = new RegistrationService(
      mockParticipantService as any,
      mockEventService as any,
      mockSessionService as any
    );

    // Inject QRCodeService for QR code related tests
    (registrationService as any).qrCodeService = mockQRCodeService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration with Unique Names', () => {
    it('should register user with unique name per event', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
        participants: []
      };

      const mockParticipant = {
        id: 'participant-123',
        eventId,
        name: userName,
        registeredAt: new Date(),
        sessionId: 'session-123'
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockResolvedValue(mockParticipant);
      mockSessionService.createUserSession.mockResolvedValue('session-123');

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.participant).toEqual(mockParticipant);
      expect(result.sessionId).toBe('session-123');
      expect(mockParticipantService.findByEventAndName).toHaveBeenCalledWith(eventId, userName);
      expect(mockParticipantService.create).toHaveBeenCalledWith({
        eventId,
        name: userName
      });
      expect(mockSessionService.createUserSession).toHaveBeenCalledWith('participant-123', eventId);
    });

    it('should block duplicate name registration in same event', async () => {
      // Arrange
      const eventId = 'event-123';
      const duplicateName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const existingParticipant = {
        id: 'participant-456',
        eventId,
        name: duplicateName,
        registeredAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(existingParticipant);

      // Act
      const result = await registrationService.registerParticipant(eventId, duplicateName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Name already registered for this event');
      expect(result.participant).toBeUndefined();
      expect(mockParticipantService.create).not.toHaveBeenCalled();
      expect(mockSessionService.createUserSession).not.toHaveBeenCalled();
    });

    it('should allow same name in different events', async () => {
      // Arrange
      const sameName = 'John Doe';
      const event1Id = 'event-123';
      const event2Id = 'event-456';

      const mockEvent1 = {
        id: event1Id,
        name: 'Event 1',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockEvent2 = {
        id: event2Id,
        name: 'Event 2',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      mockEventService.findById
        .mockResolvedValueOnce(mockEvent1)
        .mockResolvedValueOnce(mockEvent2);

      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create
        .mockResolvedValueOnce({
          id: 'participant-123',
          eventId: event1Id,
          name: sameName,
          registeredAt: new Date(),
          sessionId: 'session-123'
        })
        .mockResolvedValueOnce({
          id: 'participant-456',
          eventId: event2Id,
          name: sameName,
          registeredAt: new Date(),
          sessionId: 'session-456'
        });

      mockSessionService.createUserSession
        .mockResolvedValueOnce('session-123')
        .mockResolvedValueOnce('session-456');

      // Act
      const result1 = await registrationService.registerParticipant(event1Id, sameName);
      const result2 = await registrationService.registerParticipant(event2Id, sameName);

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.participant.eventId).toBe(event1Id);

      expect(result2.success).toBe(true);
      expect(result2.participant.eventId).toBe(event2Id);
    });

    it('should validate name format and length', async () => {
      // Arrange
      const eventId = 'event-123';
      const invalidNames = [
        '',
        '   ',
        'A',
        'B'.repeat(101), // Too long
        '123',
        '@#$%',
        'Name with \n newline'
      ];

      // Act & Assert
      for (const invalidName of invalidNames) {
        const result = await registrationService.registerParticipant(eventId, invalidName);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/name|invalid|format|length/i);
      }
    });

    it('should accept valid name formats', async () => {
      // Arrange
      const eventId = 'event-123';
      const validNames = [
        'John Doe',
        'María García',
        'Jean-Pierre Dupont',
        'O\'Sullivan',
        '李明',
        'Giuseppe Verdi Jr.',
        'Anne-Marie'
      ];

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);

      // Mock successful creation for all valid names
      mockParticipantService.create.mockImplementation((data) => Promise.resolve({
        id: `participant-${Math.random()}`,
        eventId: data.eventId,
        name: data.name,
        registeredAt: new Date(),
        sessionId: `session-${Math.random()}`
      }));

      mockSessionService.createUserSession.mockImplementation(() =>
        Promise.resolve(`session-${Math.random()}`)
      );

      // Act & Assert
      for (const validName of validNames) {
        const result = await registrationService.registerParticipant(eventId, validName);
        expect(result.success).toBe(true);
        expect(result.participant.name).toBe(validName);
      }
    });
  });

  describe('Registration State Validation', () => {
    it('should only allow registration in REGISTRATION state', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const registrationEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-123',
        eventId,
        name: userName,
        registeredAt: new Date(),
        sessionId: 'session-123'
      };

      mockEventService.findById.mockResolvedValue(registrationEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockResolvedValue(mockParticipant);
      mockSessionService.createUserSession.mockResolvedValue('session-123');

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should block registration in INIT state', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const initEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(initEvent);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration is not open for this event');
      expect(mockParticipantService.create).not.toHaveBeenCalled();
    });

    it('should block registration in DRAW state', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const drawEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.DRAW,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(drawEvent);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration is closed - draw in progress');
      expect(mockParticipantService.create).not.toHaveBeenCalled();
    });

    it('should block registration in CLOSED state', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const closedEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.CLOSED,
        registrationOpen: false,
        closed: true
      };

      mockEventService.findById.mockResolvedValue(closedEvent);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event is closed');
      expect(mockParticipantService.create).not.toHaveBeenCalled();
    });

    it('should block registration when registrationOpen is false', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const closedRegistrationEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: false,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(closedRegistrationEvent);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration is not open for this event');
      expect(mockParticipantService.create).not.toHaveBeenCalled();
    });
  });

  describe('Session Persistence and Recovery', () => {
    it('should create session after successful registration', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-123',
        eventId,
        name: userName,
        registeredAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockResolvedValue(mockParticipant);
      mockSessionService.createUserSession.mockResolvedValue('session-123');

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('session-123');
      expect(mockSessionService.createUserSession).toHaveBeenCalledWith('participant-123', eventId);
    });

    it('should recover user session from browser storage', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockSession = {
        id: sessionId,
        participantId: 'participant-123',
        eventId: 'event-123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const mockParticipant = {
        id: 'participant-123',
        eventId: 'event-123',
        name: 'John Doe',
        registeredAt: new Date()
      };

      mockSessionService.validateUserSession.mockResolvedValue(mockSession);
      mockParticipantService.findById.mockResolvedValue(mockParticipant);

      // Act
      const result = await registrationService.recoverSession(sessionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.participant).toEqual(mockParticipant);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle expired session recovery', async () => {
      // Arrange
      const sessionId = 'expired-session';
      mockSessionService.validateUserSession.mockResolvedValue(null);

      // Act
      const result = await registrationService.recoverSession(sessionId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired or invalid');
      expect(result.participant).toBeUndefined();
    });

    it('should maintain session across page refreshes', async () => {
      // Arrange
      const sessionId = 'persistent-session';
      const mockSession = {
        id: sessionId,
        participantId: 'participant-123',
        eventId: 'event-123',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockSessionService.validateUserSession.mockResolvedValue(mockSession);

      // Simulate multiple recovery attempts (page refreshes)
      const recoveryAttempts = 5;

      // Act & Assert
      for (let i = 0; i < recoveryAttempts; i++) {
        const result = await registrationService.recoverSession(sessionId);
        expect(result.success).toBe(true);
        expect(result.session.id).toBe(sessionId);
      }
    });

    it('should extend session on user activity', async () => {
      // Arrange
      const sessionId = 'active-session';
      const newExpiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

      mockSessionService.extendSession.mockResolvedValue({
        id: sessionId,
        participantId: 'participant-123',
        eventId: 'event-123',
        createdAt: new Date(),
        expiresAt: newExpiryTime
      });

      // Act
      const result = await registrationService.extendUserSession(sessionId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.session.expiresAt).toEqual(newExpiryTime);
      expect(mockSessionService.extendSession).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('Registration Link and QR Code Generation', () => {
    it('should generate registration link for event', async () => {
      // Arrange
      const eventId = 'event-123';
      const expectedUrl = `https://example.com/register/${eventId}`;

      mockQRCodeService.generateRegistrationUrl.mockReturnValue(expectedUrl);

      // Act
      const registrationUrl = registrationService.generateRegistrationLink(eventId);

      // Assert
      expect(registrationUrl).toBe(expectedUrl);
      expect(mockQRCodeService.generateRegistrationUrl).toHaveBeenCalledWith(eventId);
    });

    it('should generate QR code for registration link', async () => {
      // Arrange
      const eventId = 'event-123';
      const registrationUrl = `https://example.com/register/${eventId}`;
      const qrCodeData = 'data:image/png;base64,qrcode-data-here';

      mockQRCodeService.generateRegistrationUrl.mockReturnValue(registrationUrl);
      mockQRCodeService.generateQRCode.mockResolvedValue(qrCodeData);

      // Act
      const result = await registrationService.generateQRCode(eventId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.qrCodeData).toBe(qrCodeData);
      expect(result.registrationUrl).toBe(registrationUrl);
      expect(mockQRCodeService.generateQRCode).toHaveBeenCalledWith(registrationUrl);
    });

    it('should handle QR code generation errors', async () => {
      // Arrange
      const eventId = 'event-123';
      mockQRCodeService.generateRegistrationUrl.mockReturnValue('https://example.com/register/event-123');
      mockQRCodeService.generateQRCode.mockRejectedValue(new Error('QR generation failed'));

      // Act
      const result = await registrationService.generateQRCode(eventId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate QR code');
    });

    it('should validate registration link format', async () => {
      // Arrange
      const eventId = 'event-123';
      const generatedUrl = registrationService.generateRegistrationLink(eventId);

      // Act & Assert
      expect(generatedUrl).toMatch(/^https?:\/\/.+\/register\/.+$/);
      expect(generatedUrl).toContain(eventId);
    });

    it('should generate unique QR codes for different events', async () => {
      // Arrange
      const event1Id = 'event-123';
      const event2Id = 'event-456';

      mockQRCodeService.generateRegistrationUrl
        .mockReturnValueOnce(`https://example.com/register/${event1Id}`)
        .mockReturnValueOnce(`https://example.com/register/${event2Id}`);

      mockQRCodeService.generateQRCode
        .mockResolvedValueOnce('qr-data-1')
        .mockResolvedValueOnce('qr-data-2');

      // Act
      const qr1 = await registrationService.generateQRCode(event1Id);
      const qr2 = await registrationService.generateQRCode(event2Id);

      // Assert
      expect(qr1.qrCodeData).toBe('qr-data-1');
      expect(qr2.qrCodeData).toBe('qr-data-2');
      expect(qr1.registrationUrl).not.toBe(qr2.registrationUrl);
    });
  });

  describe('Registration Form Component', () => {
    it('should render registration form with event name', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      // Act
      render(<RegistrationForm event={mockEvent} />);

      // Assert
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    it('should submit registration form with valid name', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      const onSubmit = jest.fn();

      // Act
      render(<RegistrationForm event={mockEvent} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      await user.type(nameInput, 'John Doe');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          eventId: 'event-123',
          name: 'John Doe'
        });
      });
    });

    it('should show validation error for empty name', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      // Act
      render(<RegistrationForm event={mockEvent} />);

      const submitButton = screen.getByRole('button', { name: /register/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should disable form when registration is closed', () => {
      // Arrange
      const mockEvent = {
        id: 'event-123',
        name: 'Closed Event',
        state: EventState.DRAW,
        registrationOpen: false
      };

      // Act
      render(<RegistrationForm event={mockEvent} />);

      // Assert
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /register/i })).toBeDisabled();
      expect(screen.getByText(/registration is closed/i)).toBeInTheDocument();
    });

    it('should show loading state during submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));

      // Act
      render(<RegistrationForm event={mockEvent} onSubmit={slowSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      await user.type(nameInput, 'John Doe');
      await user.click(submitButton);

      // Assert
      expect(screen.getByText(/registering/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should display success message after successful registration', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      const successSubmit = jest.fn(() => Promise.resolve({
        success: true,
        participant: { name: 'John Doe' }
      }));

      // Act
      render(<RegistrationForm event={mockEvent} onSubmit={successSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      await user.type(nameInput, 'John Doe');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/successfully registered/i)).toBeInTheDocument();
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      });
    });

    it('should display error message for duplicate registration', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true
      };

      const errorSubmit = jest.fn(() => Promise.resolve({
        success: false,
        error: 'Name already registered for this event'
      }));

      // Act
      render(<RegistrationForm event={mockEvent} onSubmit={errorSubmit} />);

      const nameInput = screen.getByLabelText(/name/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      await user.type(nameInput, 'John Doe');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/name already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle event not found error', async () => {
      // Arrange
      const eventId = 'nonexistent-event';
      const userName = 'John Doe';

      mockEventService.findById.mockResolvedValue(null);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should handle database errors during registration', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed due to system error');
    });

    it('should handle session creation failures', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-123',
        eventId,
        name: userName,
        registeredAt: new Date()
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockResolvedValue(mockParticipant);
      mockSessionService.createUserSession.mockRejectedValue(new Error('Session creation failed'));

      // Act
      const result = await registrationService.registerParticipant(eventId, userName);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration successful but session creation failed');
      expect(result.participant).toEqual(mockParticipant);
    });

    it('should rollback registration on session failure', async () => {
      // Arrange
      const eventId = 'event-123';
      const userName = 'John Doe';

      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      mockEventService.findById.mockResolvedValue(mockEvent);
      mockParticipantService.findByEventAndName.mockResolvedValue(null);
      mockParticipantService.create.mockResolvedValue({
        id: 'participant-123',
        eventId,
        name: userName,
        registeredAt: new Date()
      });
      mockSessionService.createUserSession.mockRejectedValue(new Error('Session creation failed'));
      mockParticipantService.delete.mockResolvedValue(true);

      // Act
      const result = await registrationService.registerParticipant(eventId, userName, { rollbackOnSessionFailure: true });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed - session could not be created');
      expect(mockParticipantService.delete).toHaveBeenCalledWith('participant-123');
    });
  });
});