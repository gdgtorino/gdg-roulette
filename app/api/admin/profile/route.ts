import { NextRequest, NextResponse } from 'next/server';

// Force dynamic to handle cookies
export const dynamic = 'force-dynamic';

function getAuthToken(request: NextRequest): string | null {
  // Check for auth_token cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) return cookieToken;

  // Check for Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

function isValidToken(token: string): boolean {
  try {
    // Simple JWT validation - in production you'd use a proper JWT library
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Check if token is expired (basic check)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);

    return payload.exp && payload.exp > now && payload.adminId;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token || !isValidToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token to get admin info
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      success: true,
      admin: {
        id: payload.adminId,
        username: payload.username,
        role: payload.role || 'ADMIN',
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
