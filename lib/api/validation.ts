import { z } from 'zod';
import { NextRequest } from 'next/server';

// Common validation schemas
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long'),
});

export const RegisterParticipantSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export const EventIdSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
});

// API validation helper
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: result.error.errors.map((e) => e.message).join(', '),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch {
    return {
      success: false,
      error: 'Invalid JSON in request body',
    };
  }
}

// URL parameters validation
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map((e) => e.message).join(', '),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Authentication header validation
export function validateAuthHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7);
}

// CORS helper
export function createCorsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Error response helper
export function createErrorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}

// Success response helper
export function createSuccessResponse<T>(data: T, status: number = 200) {
  return Response.json({ data }, { status });
}

// Alias for compatibility
export const validateRequest = validateRequestBody;
