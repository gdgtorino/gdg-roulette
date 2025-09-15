import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    // Handle mock tokens for development/testing
    if (token.startsWith('mock.')) {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const now = Math.floor(Date.now() / 1000);
      return payload.exp && payload.exp > now && payload.adminId;
    }

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle admin routes redirect for E2E tests
  if (pathname === '/admin/login') {
    const loginUrl = new URL('/en/admin', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/admin/dashboard') {
    const dashboardUrl = new URL('/en/admin/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Check authentication for admin routes
  if (pathname.startsWith('/(admin)') || pathname.startsWith('/admin')) {
    const token = getAuthToken(request);

    if (!token || !isValidToken(token)) {
      // Skip redirect if already on login page
      if (pathname.includes('/admin') && !pathname.includes('dashboard')) {
        return NextResponse.next();
      }
      const loginUrl = new URL('/en/admin', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check session for protected API routes
  if (
    pathname.startsWith('/api/admin') ||
    (pathname.startsWith('/api/events/') && request.method !== 'GET')
  ) {
    const token = getAuthToken(request);

    if (pathname.includes('/execute') || pathname.includes('/delete')) {
      if (!token || !isValidToken(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // Handle CORS
  const response = NextResponse.next();

  // CORS headers
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.NEXTAUTH_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );

  // Security headers (similar to helmet)
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
