import type { NextRequest } from 'next/server';
import { verifyToken } from '../utils/auth';
import { redisService } from '../redis';
import type { JWTPayload } from '../types';

export interface Context {
  req: NextRequest;
  admin?: JWTPayload;
}

export async function createContext({ req }: { req: NextRequest }): Promise<Context> {
  // Connect to Redis if not already connected
  await redisService.connect();

  // Extract token from Authorization header
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let admin: JWTPayload | undefined;

  if (token) {
    try {
      admin = verifyToken(token);
    } catch {
      // Token is invalid or expired - continue without admin context
      console.log('Invalid token provided');
    }
  }

  return {
    req,
    admin,
  };
}
