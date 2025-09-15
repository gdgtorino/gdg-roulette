import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SessionData {
  id: string;
  token: string;
  adminId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionValidationResult {
  valid: boolean;
  session: SessionData | null;
}

export class SessionManager {
  private readonly jwtSecret: string;
  private readonly sessionDuration: number; // in milliseconds

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
    this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Create a new session for an admin
   */
  async createSession(adminId: string): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const expiresAt = new Date(Date.now() + this.sessionDuration);

      // Create JWT token
      const token = jwt.sign(
        {
          sessionId,
          adminId,
          expiresAt: expiresAt.getTime()
        },
        this.jwtSecret,
        {
          expiresIn: '24h',
          issuer: 'lottery-app',
          audience: 'lottery-admin'
        }
      );

      // Store session in database
      await prisma.session.create({
        data: {
          id: sessionId,
          sessionToken: token,
          userId: adminId,
          expires: expiresAt
        }
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  /**
   * Validate and get session data
   */
  async validateSession(token: string): Promise<SessionData | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      if (!decoded.sessionId || !decoded.adminId) {
        return null;
      }

      // Check if session exists in database and is not expired
      const session = await prisma.session.findUnique({
        where: {
          sessionToken: token
        }
      });

      if (!session || session.expires < new Date()) {
        // Clean up expired session
        if (session) {
          await this.destroySession(token);
        }
        return null;
      }

      return {
        id: session.id,
        token: session.sessionToken,
        adminId: session.userId,
        expiresAt: session.expires,
        createdAt: new Date(decoded.iat * 1000)
      };
    } catch (error) {
      // Invalid token or other JWT error
      return null;
    }
  }

  /**
   * Get session by token
   */
  async getSession(token: string): Promise<SessionData | null> {
    try {
      const session = await prisma.session.findUnique({
        where: {
          sessionToken: token
        }
      });

      if (!session) {
        return null;
      }

      // Check if expired
      if (session.expires < new Date()) {
        await this.destroySession(token);
        return null;
      }

      return {
        id: session.id,
        token: session.sessionToken,
        adminId: session.userId,
        expiresAt: session.expires,
        createdAt: new Date() // Using current date as we don't store created at
      };
    } catch (error) {
      throw new Error(`Failed to get session: ${error}`);
    }
  }

  /**
   * Destroy a specific session
   */
  async destroySession(token: string): Promise<boolean> {
    try {
      await prisma.session.delete({
        where: {
          sessionToken: token
        }
      });
      return true;
    } catch (error) {
      // Session might not exist, which is fine
      return true;
    }
  }

  /**
   * Get all active sessions for an admin
   */
  async getActiveSessionsForAdmin(adminId: string): Promise<string[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: {
          userId: adminId,
          expires: {
            gt: new Date()
          }
        },
        select: {
          sessionToken: true
        }
      });

      return sessions.map(s => s.sessionToken);
    } catch (error) {
      throw new Error(`Failed to get active sessions: ${error}`);
    }
  }

  /**
   * Destroy all sessions for an admin
   */
  async destroyAllSessionsForAdmin(adminId: string): Promise<boolean> {
    try {
      await prisma.session.deleteMany({
        where: {
          userId: adminId
        }
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to destroy all sessions: ${error}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        }
      });
      return result.count;
    } catch (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error}`);
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(token: string): Promise<SessionData | null> {
    try {
      const newExpiresAt = new Date(Date.now() + this.sessionDuration);

      const session = await prisma.session.update({
        where: {
          sessionToken: token
        },
        data: {
          expires: newExpiresAt
        }
      });

      // Create new JWT token with extended expiration
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const newToken = jwt.sign(
        {
          sessionId: session.id,
          adminId: session.userId,
          expiresAt: newExpiresAt.getTime()
        },
        this.jwtSecret,
        {
          expiresIn: '24h',
          issuer: 'lottery-app',
          audience: 'lottery-admin'
        }
      );

      // Update token in database
      await prisma.session.update({
        where: {
          id: session.id
        },
        data: {
          sessionToken: newToken
        }
      });

      return {
        id: session.id,
        token: newToken,
        adminId: session.userId,
        expiresAt: newExpiresAt,
        createdAt: new Date(decoded.iat * 1000)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    expiredToday: number;
    oldestActiveSession: Date | null;
  }> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const totalActive = await prisma.session.count({
        where: {
          expires: {
            gt: now
          }
        }
      });

      const expiredToday = await prisma.session.count({
        where: {
          expires: {
            gte: startOfDay,
            lt: now
          }
        }
      });

      const oldestSession = await prisma.session.findFirst({
        where: {
          expires: {
            gt: now
          }
        },
        orderBy: {
          expires: 'asc'
        }
      });

      return {
        totalActive,
        expiredToday,
        oldestActiveSession: oldestSession?.expires || null
      };
    } catch (error) {
      throw new Error(`Failed to get session stats: ${error}`);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}