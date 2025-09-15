import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

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

// Initialize the intl middleware for non-admin routes
const handleI18nRouting = createIntlMiddleware({
  locales: ['en', 'it'],
  defaultLocale: 'en',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for admin routes and API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    // Redirect /admin to /admin/login
    if (pathname === '/admin') {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check authentication for admin routes (except login page)
    if (pathname.startsWith('/admin') && !pathname.includes('/admin/login')) {
      const token = getAuthToken(request);

      if (!token || !isValidToken(token)) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  } else {
    // Handle i18n for non-admin routes
    return handleI18nRouting(request);
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
