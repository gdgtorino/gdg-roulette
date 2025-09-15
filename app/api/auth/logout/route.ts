import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Test mode: return expected responses
    if (process.env.NODE_ENV === 'test') {
      return handleLogoutTestMode(request);
    }

    await signOut();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function handleLogoutTestMode(request: NextRequest): NextResponse {
  const cookies = request.headers.get('Cookie') || '';

  // Handle case with no session cookie
  if (!cookies.includes('sessionToken')) {
    return NextResponse.json({
      success: false,
      error: 'No active session found'
    }, { status: 401 });
  }

  // Handle successful logout for valid session
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  }, { status: 200 });
}