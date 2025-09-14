import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import type { JWTPayload } from './types';

export interface AuthenticatedRequest extends NextRequest {
  admin?: JWTPayload;
}

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export function validateAuth(request: NextRequest): JWTPayload | null {
  const token = getAuthToken(request);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function createAuthResponse(message: string, status: number = 401) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export function requireAuth(handler: (req: AuthenticatedRequest, admin: JWTPayload) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const admin = validateAuth(request);

    if (!admin) {
      return createAuthResponse('Access token required');
    }

    const authRequest = request as AuthenticatedRequest;
    authRequest.admin = admin;

    return handler(authRequest, admin);
  };
}