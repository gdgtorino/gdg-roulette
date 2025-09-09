import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';
import type { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  admin?: JWTPayload;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const admin = verifyToken(token);
    req.admin = admin;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}