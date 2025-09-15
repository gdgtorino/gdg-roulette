/**
 * Participants API Route Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as registerParticipantHandler } from '../../app/api/participants/route';
import { ParticipantService } from '../../lib/services/ParticipantService';
import { EventService } from '../../lib/services/EventService';
import { SessionService } from '../../lib/services/SessionService';
import { NotificationService } from '../../lib/services/NotificationService';
import { EventState } from '../../lib/state/EventStateMachine';

// Mock services
jest.mock('../../lib/services/ParticipantService');
jest.mock('../../lib/services/EventService');
jest.mock('../../lib/services/SessionService');
jest.mock('../../lib/services/NotificationService');

describe('/api/participants API Routes', () => {
  let participantService: jest.Mocked<ParticipantService>;
  let eventService: jest.Mocked<EventService>;
  let sessionService: jest.Mocked<SessionService>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    participantService = new ParticipantService() as jest.Mocked<ParticipantService>;
    eventService = new EventService() as jest.Mocked<EventService>;
    sessionService = new SessionService() as jest.Mocked<SessionService>;
    notificationService = new NotificationService() as jest.Mocked<NotificationService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/participants', () => {
    it('should register participant with valid data', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
        maxParticipants: 100,
        currentParticipants: 25
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'John Doe',
        registeredAt: new Date(),
        qrCode: 'participant-qr-code'
      };

      const mockSession = {
        id: 'session-789',
        participantId: 'participant-456',
        eventId: 'event-123',
        token: 'session-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockResolvedValue(mockSession);
      notificationService.sendRegistrationConfirmation.mockResolvedValue(true);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.participant.name).toBe('John Doe');
      expect(responseData.participant.eventId).toBe('event-123');
      expect(responseData.sessionToken).toBe('session-token-123');
      expect(participantService.create).toHaveBeenCalledWith({
        eventId: 'event-123',
        name: 'John Doe'
      });
      expect(sessionService.createUserSession).toHaveBeenCalledWith('participant-456', 'event-123');

      // Check for secure session cookie
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('userSession=session-token-123');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Secure');
    });

    it('should reject duplicate name registration', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'Existing User'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const existingParticipant = {
        id: 'participant-existing',
        eventId: 'event-123',
        name: 'Existing User',
        registeredAt: new Date()
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(existingParticipant);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Name already registered for this event');
      expect(responseData.existingParticipant).toBeDefined();
      expect(participantService.create).not.toHaveBeenCalled();
    });

    it('should validate required registration fields', async () => {
      // Arrange
      const invalidRequests = [
        { name: 'John Doe' }, // Missing eventId
        { eventId: 'event-123' }, // Missing name
        { eventId: '', name: 'John Doe' }, // Empty eventId
        { eventId: 'event-123', name: '' }, // Empty name
        { eventId: 'event-123', name: '   ' }, // Whitespace only name
        {}
      ];

      // Act & Assert
      for (const invalidData of invalidRequests) {
        const request = new NextRequest(new Request('http://localhost/api/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invalidData)
        });

        const response = await registerParticipantHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toMatch(/required|missing|invalid/i);
      }
    });

    it('should validate name format and length', async () => {
      // Arrange
      const invalidNames = [
        'A', // Too short
        'B'.repeat(101), // Too long
        '123', // Numbers only
        '@#$%', // Special characters only
        'Name\nWith\nNewlines', // Contains newlines
        'Name\tWith\tTabs' // Contains tabs
      ];

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      eventService.findById.mockResolvedValue(mockEvent);

      // Act & Assert
      for (const invalidName of invalidNames) {
        const registrationData = {
          eventId: 'event-123',
          name: invalidName
        };

        const request = new NextRequest(new Request('http://localhost/api/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData))
        });

        const response = await registerParticipantHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toMatch(/name.*invalid|format|length/i);
      }
    });

    it('should accept valid international names', async () => {
      // Arrange
      const validNames = [
        'María García',
        'Jean-Pierre Dupont',
        'O\'Sullivan',
        '李明',
        'Giuseppe Verdi Jr.',
        'Anne-Marie',
        'José María de la Cruz'
      ];

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);

      // Act & Assert
      for (const validName of validNames) {
        const registrationData = {
          eventId: 'event-123',
          name: validName
        };

        const mockParticipant = {
          id: `participant-${Math.random()}`,
          eventId: 'event-123',
          name: validName,
          registeredAt: new Date()
        };

        const mockSession = {
          id: `session-${Math.random()}`,
          participantId: mockParticipant.id,
          eventId: 'event-123',
          token: `token-${Math.random()}`
        };

        participantService.create.mockResolvedValue(mockParticipant);
        sessionService.createUserSession.mockResolvedValue(mockSession);

        const request = new NextRequest(new Request('http://localhost/api/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData))
        });

        const response = await registerParticipantHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(201);
        expect(responseData.success).toBe(true);
        expect(responseData.participant.name).toBe(validName);
      }
    });

    it('should reject registration for non-existent event', async () => {
      // Arrange
      const registrationData = {
        eventId: 'nonexistent-event',
        name: 'John Doe'
      };

      eventService.findById.mockResolvedValue(null);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Event not found');
      expect(participantService.create).not.toHaveBeenCalled();
    });

    it('should reject registration when event is not in registration state', async () => {
      // Arrange
      const eventStates = [
        { state: EventState.INIT, message: 'Registration is not open for this event' },
        { state: EventState.DRAW, message: 'Registration is closed - draw in progress' },
        { state: EventState.CLOSED, message: 'Event is closed' }
      ];

      // Act & Assert
      for (const { state, message } of eventStates) {
        const registrationData = {
          eventId: 'event-123',
          name: 'John Doe'
        };

        const mockEvent = {
          id: 'event-123',
          name: 'Test Event',
          state,
          registrationOpen: false,
          closed: state === EventState.CLOSED
        };

        eventService.findById.mockResolvedValue(mockEvent);

        const request = new NextRequest(new Request('http://localhost/api/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData))
        });

        const response = await registerParticipantHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBe(message);
      }
    });

    it('should enforce event participant limits', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Full Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
        maxParticipants: 50,
        currentParticipants: 50
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.getParticipantCount.mockResolvedValue(50);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Event has reached maximum participant limit');
      expect(responseData.maxParticipants).toBe(50);
      expect(responseData.currentParticipants).toBe(50);
    });

    it('should handle session creation failures gracefully', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'John Doe',
        registeredAt: new Date()
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockRejectedValue(new Error('Session service unavailable'));

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.participant).toEqual(mockParticipant);
      expect(responseData.warning).toBe('Registration successful but session creation failed');
      expect(responseData.sessionToken).toBeUndefined();
    });

    it('should rollback registration on critical failures', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'John Doe',
        registeredAt: new Date()
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockRejectedValue(new Error('Critical session failure'));
      participantService.delete.mockResolvedValue(true);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rollback-On-Failure': 'true'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Registration failed - unable to create session');
      expect(participantService.delete).toHaveBeenCalledWith('participant-456');
    });

    it('should send registration confirmation notification', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'John Doe',
        email: 'john@example.com',
        registeredAt: new Date()
      };

      const mockSession = {
        id: 'session-789',
        token: 'session-token-123'
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockResolvedValue(mockSession);
      notificationService.sendRegistrationConfirmation.mockResolvedValue(true);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);

      // Assert
      expect(response.status).toBe(201);
      expect(notificationService.sendRegistrationConfirmation).toHaveBeenCalledWith({
        participant: mockParticipant,
        event: mockEvent,
        registrationUrl: expect.stringContaining('event-123')
      });
    });

    it('should generate unique QR code for each participant', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'John Doe'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'John Doe',
        registeredAt: new Date(),
        qrCode: 'data:image/png;base64,participant-qr-code-data'
      };

      const mockSession = {
        id: 'session-789',
        token: 'session-token-123'
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockResolvedValue(mockSession);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.participant.qrCode).toBeDefined();
      expect(responseData.participant.qrCode).toContain('data:image/png;base64');
    });

    it('should handle concurrent registration attempts for same name', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'Popular Name'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      eventService.findById.mockResolvedValue(mockEvent);

      // First request succeeds
      participantService.findByEventAndName.mockResolvedValueOnce(null);
      participantService.create.mockResolvedValueOnce({
        id: 'participant-first',
        name: 'Popular Name',
        eventId: 'event-123'
      });

      // Second concurrent request fails
      participantService.findByEventAndName.mockResolvedValueOnce({
        id: 'participant-first',
        name: 'Popular Name',
        eventId: 'event-123'
      });

      const request1 = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData))
      });

      const request2 = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData))
      });

      // Act
      const [response1, response2] = await Promise.all([
        registerParticipantHandler(request1),
        registerParticipantHandler(request2)
      ]);

      // Assert
      const responseData1 = await response1.json();
      const responseData2 = await response2.json();

      expect([response1.status, response2.status]).toContain(201); // One succeeds
      expect([response1.status, response2.status]).toContain(409); // One fails with conflict
    });

    it('should implement rate limiting for registration attempts', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'Rate Limited User'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);

      // Act - Make multiple rapid registration attempts from same IP
      const promises = [];
      for (let i = 0; i < 6; i++) { // Exceed rate limit of 5 attempts per minute
        const request = new NextRequest(new Request('http://localhost/api/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.1' // Same IP
          },
          body: JSON.stringify({ ...registrationData, name: `User ${i}` })
        });
        promises.push(registerParticipantHandler(request));
      }

      const responses = await Promise.all(promises);
      const lastResponse = responses[responses.length - 1];
      const lastResponseData = await lastResponse.json();

      // Assert
      expect(lastResponse.status).toBe(429);
      expect(lastResponseData.success).toBe(false);
      expect(lastResponseData.error).toBe('Too many registration attempts. Please try again later.');
    });

    it('should log registration activities for analytics', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'Analytics User'
      };

      const mockEvent = {
        id: 'event-123',
        name: 'Test Event',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'Analytics User',
        registeredAt: new Date()
      };

      const mockSession = {
        id: 'session-789',
        token: 'session-token-123'
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockResolvedValue(mockSession);

      const analyticsLogSpy = jest.spyOn(console, 'info').mockImplementation();

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100',
          'User-Agent': 'Test Browser'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      await registerParticipantHandler(request);

      // Assert
      expect(analyticsLogSpy).toHaveBeenCalledWith(
        'Participant Registration',
        expect.objectContaining({
          eventId: 'event-123',
          eventName: 'Test Event',
          participantId: 'participant-456',
          participantName: 'Analytics User',
          ip: '192.168.1.100',
          userAgent: 'Test Browser',
          timestamp: expect.any(Date)
        })
      );

      analyticsLogSpy.mockRestore();
    });

    it('should sanitize input to prevent injection attacks', async () => {
      // Arrange
      const maliciousData = {
        eventId: 'event-123\'; DROP TABLE participants; --',
        name: '<script>alert("xss")</script>John Doe'
      };

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousData)
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toMatch(/invalid.*characters|sanitization|security/i);
      expect(eventService.findById).not.toHaveBeenCalledWith(maliciousData.eventId);
    });

    it('should return consistent response format', async () => {
      // Arrange
      const registrationData = {
        eventId: 'event-123',
        name: 'Consistent User'
      };

      const mockEvent = {
        id: 'event-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false
      };

      const mockParticipant = {
        id: 'participant-456',
        eventId: 'event-123',
        name: 'Consistent User',
        registeredAt: new Date()
      };

      const mockSession = {
        id: 'session-789',
        token: 'session-token-123'
      };

      eventService.findById.mockResolvedValue(mockEvent);
      participantService.findByEventAndName.mockResolvedValue(null);
      participantService.create.mockResolvedValue(mockParticipant);
      sessionService.createUserSession.mockResolvedValue(mockSession);

      const request = new NextRequest(new Request('http://localhost/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData))
      });

      // Act
      const response = await registerParticipantHandler(request);
      const responseData = await response.json();

      // Assert
      expect(responseData).toHaveProperty('success');
      expect(responseData).toHaveProperty('participant');
      expect(responseData).toHaveProperty('sessionToken');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData.participant).toHaveProperty('id');
      expect(responseData.participant).toHaveProperty('name');
      expect(responseData.participant).toHaveProperty('eventId');
      expect(responseData.participant).toHaveProperty('registeredAt');
    });
  });
});