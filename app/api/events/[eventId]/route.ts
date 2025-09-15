import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '../../../../lib/services/EventService';
import { AuthService } from '../../../../lib/services/AuthService';

// const updateEventSchema = z.object({
//   name: z.string().min(1).optional(),
//   description: z.string().optional(),
//   maxParticipants: z.number().int().positive().optional(),
//   prizePool: z.number().positive().optional(),
//   status: z.enum(['draft', 'registration', 'drawing', 'completed']).optional(),
// });

// Global service instances that can be overridden in tests
let eventService: EventService;
let authService: AuthService;

// Initialize services
eventService = new EventService();
authService = new AuthService();

// Function to set test services
// Note: Commented out for build compatibility - re-enable for testing
// export function setTestServices(services: {
//   eventService?: EventService;
//   authService?: AuthService;
// }) {
//   if (services.eventService) eventService = services.eventService;
//   if (services.authService) authService = services.authService;
// }

interface RouteParams {
  params: {
    eventId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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
        sessionToken = undefined;
      }
    } catch {
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

    // Get event details using service
    const result = await eventService.getEventDetails(params.eventId, adminId);

    if (!result.success) {
      const status = result.error === 'Event not found' ? 404 :
                    result.error === 'Access denied - not event creator' ? 403 : 400;
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }

    return NextResponse.json({
      success: true,
      event: result.event
    });
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
        sessionToken = undefined;
      }
    } catch {
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
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON format'
      }, { status: 400 });
    }

    // Update event using service
    const result = await eventService.updateEvent(params.eventId, body, adminId);

    if (!result.success) {
      const status = result.error === 'Event not found' ? 404 :
                    result.error === 'Access denied - not event creator' ? 403 :
                    result.error === 'Cannot modify closed event' ? 400 :
                    result.error === 'Invalid state transition' ? 400 : 400;
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }

    return NextResponse.json({
      success: true,
      event: result.event
    });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        sessionToken = undefined;
      }
    } catch {
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

    // Check for deletion confirmation header
    let confirmationHeader;
    try {
      if (request.headers && typeof request.headers.get === 'function') {
        confirmationHeader = request.headers.get('X-Confirm-Delete');
      } else {
        confirmationHeader = null;
      }
    } catch {
      confirmationHeader = null;
    }

    if (!confirmationHeader || confirmationHeader !== 'true') {
      return NextResponse.json({
        success: false,
        error: 'Deletion confirmation required'
      }, { status: 400 });
    }

    // Delete event using service
    const result = await eventService.deleteEvent(params.eventId, adminId);

    if (!result.success) {
      const status = result.error === 'Event not found' ? 404 :
                    result.error === 'Access denied - not event creator' ? 403 :
                    result.error === 'Cannot delete event with registered participants' ? 400 : 400;
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status });
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

