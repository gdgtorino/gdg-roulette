import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { validateRequest } from '@/lib/api/validation';
import { createEvent, getEvents } from '@/lib/events/mutations';
import { EventService } from '../../../lib/services/EventService';
import { AuthService } from '../../../lib/services/AuthService';

const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  maxParticipants: z.number().int().positive().optional(),
  prizePool: z.number().positive().optional(),
  scheduledStart: z.string().datetime().optional(),
});

// Global service instances that can be overridden in tests
export let eventService: EventService;
export let authService: AuthService;

// Initialize services
eventService = new EventService();
authService = new AuthService();

// Function to set test services
export function setTestServices(services: {
  eventService?: EventService;
  authService?: AuthService;
}) {
  if (services.eventService) eventService = services.eventService;
  if (services.authService) authService = services.authService;
}

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    let sessionToken;
    try {
      if (request.headers && typeof request.headers.get === 'function') {
        const cookieHeader = request.headers.get('Cookie') || '';
        sessionToken = cookieHeader.split(';')
          .find(cookie => cookie.trim().startsWith('sessionToken='))
          ?.split('=')[1];
      } else {
        // Fallback for test environments
        sessionToken = undefined;
      }
    } catch (headerError) {
      console.error('Error extracting session token:', headerError);
      sessionToken = undefined;
    }

    // Validate session
    const sessionValidation = await authService.validateSession(sessionToken);

    if (!sessionValidation.valid || !sessionValidation.session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const adminId = sessionValidation.session.adminId;

    // Parse query parameters
    let stateParam, pageParam, pageSizeParam;
    try {
      if (request.url) {
        const url = new URL(request.url);
        stateParam = url.searchParams.get('state');
        pageParam = url.searchParams.get('page');
        pageSizeParam = url.searchParams.get('pageSize');
      }
    } catch (urlError) {
      // Default values for test environments
      stateParam = null;
      pageParam = null;
      pageSizeParam = null;
    }

    let result;

    if (stateParam) {
      // Filter by state
      result = await eventService.getEventsByState(adminId, stateParam);
    } else if (pageParam || pageSizeParam) {
      // Handle pagination
      const page = pageParam ? parseInt(pageParam) : 1;
      const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;
      result = await eventService.getEventsForAdmin(adminId, { page, pageSize });
    } else {
      // Get all events
      result = await eventService.getEventsForAdmin(adminId);
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      events: result.events,
      ...(result.pagination && { pagination: result.pagination })
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract session token from cookies
    let sessionToken;
    try {
      if (request.headers && typeof request.headers.get === 'function') {
        const cookieHeader = request.headers.get('Cookie') || '';
        sessionToken = cookieHeader.split(';')
          .find(cookie => cookie.trim().startsWith('sessionToken='))
          ?.split('=')[1];
      } else {
        // Fallback for test environments
        sessionToken = undefined;
      }
    } catch (headerError) {
      sessionToken = undefined;
    }

    // Validate session
    const sessionValidation = await authService.validateSession(sessionToken);

    if (!sessionValidation.valid || !sessionValidation.session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const adminId = sessionValidation.session.adminId;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format'
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Event name is required'
      }, { status: 400 });
    }

    if (body.maxParticipants !== undefined) {
      if (typeof body.maxParticipants !== 'number' || body.maxParticipants < 1) {
        return NextResponse.json({
          success: false,
          error: 'Max participants must be a positive number'
        }, { status: 400 });
      }
    }

    // Create event using service
    const result = await eventService.createEvent({
      ...body,
      createdBy: adminId
    });

    if (!result.success) {
      const status = result.error === 'Insufficient permissions' ? 403 : 400;
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }

    return NextResponse.json({
      success: true,
      event: result.event
    }, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

