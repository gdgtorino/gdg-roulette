import { NextRequest, NextResponse } from 'next/server';
import { LotteryService } from '../../../../../lib/services/LotteryService';
import { AuthService } from '../../../../../lib/services/AuthService';

// Global service instances that can be overridden in tests
let lotteryService: LotteryService | undefined;
let authService: AuthService | undefined;

// Initialize services - only in non-test environment
if (process.env.NODE_ENV !== 'test') {
  lotteryService = new LotteryService();
  authService = new AuthService();
}

// Function to set test services
export function setTestServices(services: {
  lotteryService?: LotteryService;
  authService?: AuthService;
}) {
  if (services.lotteryService) lotteryService = services.lotteryService;
  if (services.authService) authService = services.authService;
}

interface RouteParams {
  params: {
    eventId: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Ensure services are available
    if (!authService || !lotteryService) {
      return NextResponse.json(
        {
          success: false,
          error: 'Services not properly initialized',
        },
        { status: 500 },
      );
    }

    // Extract session token from cookies
    let sessionToken;
    try {
      if (request.headers && typeof request.headers.get === 'function') {
        const cookieHeader = request.headers.get('Cookie') || '';
        sessionToken = cookieHeader
          .split(';')
          .find((cookie) => cookie.trim().startsWith('sessionToken='))
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
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 },
      );
    }

    const adminId = sessionValidation.session.adminId;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('JSON parsing error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON format',
        },
        { status: 400 },
      );
    }

    // Validate draw type
    if (!body.type || (body.type !== 'single' && body.type !== 'all')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid draw type. Must be "single" or "all"',
        },
        { status: 400 },
      );
    }

    let result;

    if (body.type === 'single') {
      result = await lotteryService.drawSingleWinner(params.eventId, adminId);
    } else {
      result = await lotteryService.drawAllRemaining(params.eventId, adminId);
    }

    if (!result.success) {
      const status =
        result.error === 'Cannot draw winners - event is not in DRAW state'
          ? 400
          : result.error === 'No participants available for drawing'
            ? 400
            : result.error === 'Draw operation already in progress'
              ? 409
              : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status },
      );
    }

    // Broadcast real-time updates if function exists
    if (typeof global.broadcastDrawUpdate === 'function') {
      const updateData = {
        type: 'WINNER_DRAWN',
        winner: result.winner || result.winners?.[0],
        timestamp: new Date(),
      };
      global.broadcastDrawUpdate(params.eventId, updateData);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Execute draw error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
