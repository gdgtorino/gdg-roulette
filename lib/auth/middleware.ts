import { cookies } from 'next/headers';
import { verifyToken, JWTPayload } from './jwt';

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token');
  return token?.value || null;
}

export async function getCurrentAdmin(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;

  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error('unauthorized');
  }
  return admin;
}