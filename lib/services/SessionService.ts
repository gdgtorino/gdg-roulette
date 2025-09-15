import { Session, Admin, Participant } from '../types';

export interface SessionData {
  userId: string;
  userType: 'admin' | 'participant';
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: Session;
  user?: Admin | Participant;
  error?: string;
}

export class SessionService {
  private static readonly DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create new session
   */
  async createSession(sessionData: SessionData): Promise<Session> {
    try {
      const expiresAt =
        sessionData.expiresAt || new Date(Date.now() + SessionService.DEFAULT_SESSION_DURATION);

      const session: Session = {
        id: this.generateSessionId(),
        userId: sessionData.userId,
        userType: sessionData.userType,
        metadata: sessionData.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt,
        isActive: true,
      };

      // In a real implementation, this would save to database
      // For now, return the session object
      return session;
    } catch (error) {
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      // In a real implementation, this would query the database
      // For now, return null
      return null;
    } catch (error) {
      throw new Error(
        `Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        return {
          isValid: false,
          error: 'Session not found',
        };
      }

      if (!session.isActive) {
        return {
          isValid: false,
          error: 'Session is inactive',
        };
      }

      if (session.expiresAt && session.expiresAt < new Date()) {
        // Mark session as inactive
        await this.invalidateSession(sessionId);
        return {
          isValid: false,
          error: 'Session expired',
        };
      }

      // Update last accessed time
      await this.updateSessionAccess(sessionId);

      // In a real implementation, this would fetch the user data
      return {
        isValid: true,
        session,
        user: undefined, // Would be populated with actual user data
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Session validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Refresh session expiration
   */
  async refreshSession(sessionId: string, additionalDuration?: number): Promise<Session | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || !session.isActive) {
        return null;
      }

      const duration = additionalDuration || SessionService.DEFAULT_SESSION_DURATION;
      const newExpiresAt = new Date(Date.now() + duration);

      // In a real implementation, this would update the database
      session.expiresAt = newExpiresAt;
      session.updatedAt = new Date();

      return session;
    } catch (error) {
      throw new Error(
        `Failed to refresh session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update session metadata
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: Record<string, any>,
  ): Promise<Session | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      // In a real implementation, this would update the database
      session.metadata = { ...session.metadata, ...metadata };
      session.updatedAt = new Date();

      return session;
    } catch (error) {
      throw new Error(
        `Failed to update session metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      // In a real implementation, this would update the database
      // For now, return true
      return true;
    } catch (error) {
      throw new Error(
        `Failed to invalidate session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Invalidate all sessions for user
   */
  async invalidateUserSessions(userId: string): Promise<boolean> {
    try {
      // In a real implementation, this would update the database
      // For now, return true
      return true;
    } catch (error) {
      throw new Error(
        `Failed to invalidate user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      // In a real implementation, this would query the database
      // For now, return empty array
      return [];
    } catch (error) {
      throw new Error(
        `Failed to get user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get session count for user
   */
  async getUserSessionCount(userId: string): Promise<number> {
    try {
      const sessions = await this.getUserSessions(userId);
      return sessions.length;
    } catch (error) {
      throw new Error(
        `Failed to get session count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // In a real implementation, this would delete expired sessions from database
      // For now, return 0
      return 0;
    } catch (error) {
      throw new Error(
        `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    adminSessions: number;
    participantSessions: number;
  }> {
    try {
      // In a real implementation, this would query the database
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        adminSessions: 0,
        participantSessions: 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error('Session cleanup failed:', error);
      }
    }, SessionService.CLEANUP_INTERVAL);
  }

  /**
   * Update session last accessed time
   */
  private async updateSessionAccess(sessionId: string): Promise<void> {
    try {
      // In a real implementation, this would update the database
      // For now, do nothing
    } catch (error) {
      // Log error but don't throw to avoid breaking session validation
      console.error('Failed to update session access time:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 16);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Validate session ID format
   */
  isValidSessionId(sessionId: string): boolean {
    return /^sess_[a-z0-9]+_[a-z0-9]{16}$/.test(sessionId);
  }

  /**
   * Create admin session
   */
  async createAdminSession(adminId: string, metadata?: Record<string, any>): Promise<Session> {
    return this.createSession({
      userId: adminId,
      userType: 'admin',
      metadata,
    });
  }

  /**
   * Create participant session
   */
  async createParticipantSession(
    participantId: string,
    metadata?: Record<string, any>,
  ): Promise<Session> {
    return this.createSession({
      userId: participantId,
      userType: 'participant',
      metadata,
    });
  }

  /**
   * Create user session (alias for createParticipantSession)
   */
  async createUserSession(participantId: string, eventId?: string): Promise<Session> {
    return this.createParticipantSession(participantId, eventId ? { eventId } : {});
  }
}
