'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '../utils/auth';
import type { JWTPayload } from '../types';

export async function getSession(): Promise<JWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();

  if (!session) {
    redirect('/admin');
  }

  return session;
}

// Alias for compatibility
export const requireAdmin = requireAuth;
export const checkAuthSession = getSession;

export async function signOut(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete('auth_token');
  redirect('/admin');
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function signIn() {
  // This would typically validate credentials and create session
  // For now, returning a mock response
  throw new Error('signIn not implemented - use the API endpoint directly');
}