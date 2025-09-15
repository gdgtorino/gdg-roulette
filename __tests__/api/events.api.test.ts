/**
 * Events API Route Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getEventsHandler, POST as createEventHandler } from '../../app/api/events/route';
import { GET as getEventHandler, PUT as updateEventHandler, DELETE as deleteEventHandler } from '../../app/api/events/[eventId]/route';
import { POST as executeDrawHandler } from '../../app/api/draws/[eventId]/execute/route';
import { EventService } from '../../lib/services/EventService';
import { LotteryService } from '../../lib/services/LotteryService';
import { AuthService } from '../../lib/services/AuthService';
import { EventState } from '../../lib/state/EventStateMachine';

// Mock services
jest.mock('../../lib/services/EventService');
jest.mock('../../lib/services/LotteryService');
jest.mock('../../lib/services/AuthService');

describe('/api/events/* API Routes', () => {
  let eventService: jest.Mocked<EventService>;
  let lotteryService: jest.Mocked<LotteryService>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    eventService = new EventService() as jest.Mocked<EventService>;
    lotteryService = new LotteryService() as jest.Mocked<LotteryService>;
    authService = new AuthService() as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/events', () => {
    it('should return list of events for authenticated admin', async () => {
      // Arrange
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Test Event 1',
          createdBy: 'admin-123',
          state: EventState.REGISTRATION,
          registrationOpen: true,
          closed: false,
          createdAt: new Date(),
          participantCount: 25,
          winnerCount: 0
        },
        {
          id: 'event-2',
          name: 'Test Event 2',
          createdBy: 'admin-123',
          state: EventState.DRAW,
          registrationOpen: false,
          closed: false,
          createdAt: new Date(),
          participantCount: 50,
          winnerCount: 5
        }
      ];

      const mockSessionValidation = {
        valid: true,
        session: {
          id: 'session-123',
          adminId: 'admin-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventsForAdmin.mockResolvedValue({
        success: true,
        events: mockEvents
      });

      const request = new NextRequest(new Request('http://localhost/api/events', {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      }));

      // Act
      const response = await getEventsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.events).toHaveLength(2);
      expect(responseData.events[0].name).toBe('Test Event 1');
      expect(responseData.events[1].name).toBe('Test Event 2');
      expect(eventService.getEventsForAdmin).toHaveBeenCalledWith('admin-123');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      authService.validateSession.mockResolvedValue({
        valid: false,
        session: null
      });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'GET'
      });

      // Act
      const response = await getEventsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Authentication required');
      expect(eventService.getEventsForAdmin).not.toHaveBeenCalled();
    });

    it('should filter events by state when query parameter provided', async () => {
      // Arrange
      const mockActiveEvents = [
        {
          id: 'event-1',
          name: 'Active Event',
          state: EventState.REGISTRATION,
          registrationOpen: true,
          closed: false
        }
      ];

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventsByState.mockResolvedValue({
        success: true,
        events: mockActiveEvents
      });

      const request = new NextRequest('http://localhost/api/events?state=REGISTRATION', {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await getEventsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.events).toHaveLength(1);
      expect(responseData.events[0].state).toBe(EventState.REGISTRATION);
      expect(eventService.getEventsByState).toHaveBeenCalledWith('admin-123', EventState.REGISTRATION);
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const mockPaginatedEvents = {
        success: true,
        events: [/* paginated events */],
        pagination: {
          page: 2,
          pageSize: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        }
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventsForAdmin.mockResolvedValue(mockPaginatedEvents);

      const request = new NextRequest('http://localhost/api/events?page=2&pageSize=10', {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await getEventsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.pagination.page).toBe(2);
      expect(responseData.pagination.pageSize).toBe(10);
      expect(responseData.pagination.total).toBe(25);
      expect(eventService.getEventsForAdmin).toHaveBeenCalledWith('admin-123', {
        page: 2,
        pageSize: 10
      });
    });
  });

  describe('POST /api/events', () => {
    it('should create new event with valid data', async () => {
      // Arrange
      const eventData = {
        name: 'New Test Event',
        description: 'Test event description',
        maxParticipants: 100
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      const mockCreatedEvent = {
        id: 'event-456',
        name: 'New Test Event',
        description: 'Test event description',
        maxParticipants: 100,
        createdBy: 'admin-123',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false,
        qrCode: 'qr-code-data',
        createdAt: new Date()
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.createEvent.mockResolvedValue({
        success: true,
        event: mockCreatedEvent
      });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(eventData)
      });

      // Act
      const response = await createEventHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.event.name).toBe('New Test Event');
      expect(responseData.event.createdBy).toBe('admin-123');
      expect(responseData.event.state).toBe(EventState.INIT);
      expect(eventService.createEvent).toHaveBeenCalledWith({
        ...eventData,
        createdBy: 'admin-123'
      });
    });

    it('should validate required event fields', async () => {
      // Arrange
      const invalidEventData = [
        { description: 'Missing name' },
        { name: '', description: 'Empty name' },
        { name: 'Test', maxParticipants: -1 },
        { name: 'Test', maxParticipants: 'invalid' }
      ];

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);

      // Act & Assert
      for (const invalidData of invalidEventData) {
        const request = new NextRequest('http://localhost/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': 'sessionToken=session-token-123'
          },
          body: JSON.stringify(invalidData)
        });

        const response = await createEventHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toMatch(/validation|required|invalid/i);
      }
    });

    it('should require admin permissions to create event', async () => {
      // Arrange
      const eventData = {
        name: 'Unauthorized Event',
        description: 'Should not be created'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.createEvent.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions'
      });

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(eventData)
      });

      // Act
      const response = await createEventHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/events/[eventId]', () => {
    it('should return event details for authorized admin', async () => {
      // Arrange
      const eventId = 'event-123';
      const mockEvent = {
        id: eventId,
        name: 'Test Event',
        createdBy: 'admin-123',
        state: EventState.REGISTRATION,
        registrationOpen: true,
        closed: false,
        participants: [
          { id: 'p1', name: 'Alice', registeredAt: new Date() },
          { id: 'p2', name: 'Bob', registeredAt: new Date() }
        ],
        winners: [],
        createdAt: new Date()
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventDetails.mockResolvedValue({
        success: true,
        event: mockEvent
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await getEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.event.id).toBe(eventId);
      expect(responseData.event.participants).toHaveLength(2);
      expect(eventService.getEventDetails).toHaveBeenCalledWith(eventId, 'admin-123');
    });

    it('should return 404 for non-existent event', async () => {
      // Arrange
      const eventId = 'nonexistent-event';

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventDetails.mockResolvedValue({
        success: false,
        error: 'Event not found'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await getEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Event not found');
    });

    it('should return 403 for unauthorized access to event', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-456' } // Different admin
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventDetails.mockResolvedValue({
        success: false,
        error: 'Access denied - not event creator'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await getEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Access denied - not event creator');
    });
  });

  describe('PUT /api/events/[eventId]', () => {
    it('should update event with valid data and permissions', async () => {
      // Arrange
      const eventId = 'event-123';
      const updateData = {
        name: 'Updated Event Name',
        description: 'Updated description',
        maxParticipants: 200
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      const mockUpdatedEvent = {
        id: eventId,
        name: 'Updated Event Name',
        description: 'Updated description',
        maxParticipants: 200,
        createdBy: 'admin-123',
        state: EventState.REGISTRATION,
        updatedAt: new Date()
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.updateEvent.mockResolvedValue({
        success: true,
        event: mockUpdatedEvent
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(updateData)
      });

      // Act
      const response = await updateEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.event.name).toBe('Updated Event Name');
      expect(responseData.event.description).toBe('Updated description');
      expect(eventService.updateEvent).toHaveBeenCalledWith(eventId, updateData, 'admin-123');
    });

    it('should prevent updating closed events', async () => {
      // Arrange
      const eventId = 'event-123';
      const updateData = {
        name: 'Should not update'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.updateEvent.mockResolvedValue({
        success: false,
        error: 'Cannot modify closed event'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(updateData)
      });

      // Act
      const response = await updateEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Cannot modify closed event');
    });

    it('should validate state transition updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const invalidStateUpdate = {
        state: EventState.CLOSED // Invalid direct transition
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.updateEvent.mockResolvedValue({
        success: false,
        error: 'Invalid state transition'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(invalidStateUpdate)
      });

      // Act
      const response = await updateEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid state transition');
    });
  });

  describe('DELETE /api/events/[eventId]', () => {
    it('should delete event when admin has permissions', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.deleteEvent.mockResolvedValue({
        success: true,
        message: 'Event deleted successfully'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await deleteEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Event deleted successfully');
      expect(eventService.deleteEvent).toHaveBeenCalledWith(eventId, 'admin-123');
    });

    it('should prevent deletion of active events with participants', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.deleteEvent.mockResolvedValue({
        success: false,
        error: 'Cannot delete event with registered participants'
      });

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      });

      // Act
      const response = await deleteEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Cannot delete event with registered participants');
    });

    it('should require confirmation for event deletion', async () => {
      // Arrange
      const eventId = 'event-123';

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      // Request without confirmation
      authService.validateSession.mockResolvedValue(mockSessionValidation);

      const request = new NextRequest(`http://localhost/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
          // Missing confirmation header
        }
      });

      // Act
      const response = await deleteEventHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Deletion confirmation required');
    });
  });

  describe('POST /api/draws/[eventId]/execute', () => {
    it('should execute single winner draw', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'single'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      const mockDrawResult = {
        success: true,
        winner: {
          id: 'winner-1',
          participantId: 'participant-456',
          participantName: 'Alice',
          drawOrder: 1,
          drawnAt: new Date()
        }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawSingleWinner.mockResolvedValue(mockDrawResult);

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.winner.participantName).toBe('Alice');
      expect(responseData.winner.drawOrder).toBe(1);
      expect(lotteryService.drawSingleWinner).toHaveBeenCalledWith(eventId, 'admin-123');
    });

    it('should execute draw all remaining participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'all'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      const mockDrawAllResult = {
        success: true,
        winners: [
          {
            id: 'winner-1',
            participantName: 'Alice',
            drawOrder: 1
          },
          {
            id: 'winner-2',
            participantName: 'Bob',
            drawOrder: 2
          },
          {
            id: 'winner-3',
            participantName: 'Charlie',
            drawOrder: 3
          }
        ],
        totalDrawn: 3,
        eventClosed: true
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawAllRemaining.mockResolvedValue(mockDrawAllResult);

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.winners).toHaveLength(3);
      expect(responseData.totalDrawn).toBe(3);
      expect(responseData.eventClosed).toBe(true);
      expect(lotteryService.drawAllRemaining).toHaveBeenCalledWith(eventId, 'admin-123');
    });

    it('should prevent draw execution when event not in DRAW state', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'single'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawSingleWinner.mockResolvedValue({
        success: false,
        error: 'Cannot draw winners - event is not in DRAW state'
      });

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Cannot draw winners - event is not in DRAW state');
    });

    it('should handle draw execution with no participants', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'single'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawSingleWinner.mockResolvedValue({
        success: false,
        error: 'No participants available for drawing'
      });

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No participants available for drawing');
    });

    it('should validate draw type parameter', async () => {
      // Arrange
      const eventId = 'event-123';
      const invalidDrawRequest = {
        type: 'invalid-type'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(invalidDrawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid draw type. Must be "single" or "all"');
    });

    it('should broadcast real-time draw updates', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'single'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      const mockDrawResult = {
        success: true,
        winner: {
          id: 'winner-1',
          participantName: 'Alice',
          drawOrder: 1
        }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawSingleWinner.mockResolvedValue(mockDrawResult);

      // Mock broadcast service
      const mockBroadcast = jest.fn();
      (global as any).broadcastDrawUpdate = mockBroadcast;

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });

      // Assert
      expect(response.status).toBe(200);
      expect(mockBroadcast).toHaveBeenCalledWith(eventId, {
        type: 'WINNER_DRAWN',
        winner: mockDrawResult.winner,
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventsForAdmin.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(new Request('http://localhost/api/events', {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123'
        }
      }));

      // Act
      const response = await getEventsHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle malformed request bodies', async () => {
      // Arrange
      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);

      const request = new NextRequest('http://localhost/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: 'invalid-json{'
      });

      // Act
      const response = await createEventHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid JSON format');
    });

    it('should handle concurrent draw execution attempts', async () => {
      // Arrange
      const eventId = 'event-123';
      const drawRequest = {
        type: 'single'
      };

      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      lotteryService.drawSingleWinner.mockResolvedValue({
        success: false,
        error: 'Draw operation already in progress'
      });

      const request = new NextRequest(`http://localhost/api/draws/${eventId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'sessionToken=session-token-123'
        },
        body: JSON.stringify(drawRequest)
      });

      // Act
      const response = await executeDrawHandler(request, { params: { eventId } });
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Draw operation already in progress');
    });

    it('should log API access for audit purposes', async () => {
      // Arrange
      const mockSessionValidation = {
        valid: true,
        session: { adminId: 'admin-123' }
      };

      authService.validateSession.mockResolvedValue(mockSessionValidation);
      eventService.getEventsForAdmin.mockResolvedValue({
        success: true,
        events: []
      });

      const auditLogSpy = jest.spyOn(console, 'info').mockImplementation();

      const request = new NextRequest('http://localhost/api/events', {
        method: 'GET',
        headers: {
          'Cookie': 'sessionToken=session-token-123',
          'User-Agent': 'Test Browser',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      // Act
      await getEventsHandler(request);

      // Assert
      expect(auditLogSpy).toHaveBeenCalledWith(
        'API Access',
        expect.objectContaining({
          endpoint: '/api/events',
          method: 'GET',
          adminId: 'admin-123',
          ip: '192.168.1.100',
          userAgent: 'Test Browser',
          timestamp: expect.any(Date)
        })
      );

      auditLogSpy.mockRestore();
    });
  });
});