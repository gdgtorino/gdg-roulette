import { AdminRepository } from '../repositories/AdminRepository';
import { SessionManager, SessionData } from './SessionManager';
import { PasswordService } from './PasswordService';
import { Admin } from '../types';

export interface LoginResult {
  success: boolean;
  sessionToken?: string;
  admin?: Admin;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  session: SessionData | null;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

export interface RecoveryResult {
  success: boolean;
  admin?: Admin;
  error?: string;
}

export class AuthService {
  constructor(
    private sessionManager: SessionManager,
    private passwordService: PasswordService,
    private adminRepository: AdminRepository,
  ) {}

  /**
   * Authenticate admin with username and password
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Validate input
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      if (username.trim() === '' || password.trim() === '') {
        throw new Error('Username and password are required');
      }

      // Find admin by username
      const admin = await this.adminRepository.findByUsername(username);
      if (!admin) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verify(password, admin.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check for existing sessions and destroy them (prevent concurrent sessions)
      const existingSessions = await this.sessionManager.getActiveSessionsForAdmin(admin.id);
      if (Array.isArray(existingSessions)) {
        for (const sessionToken of existingSessions) {
          await this.sessionManager.destroySession(sessionToken);
        }
      }

      // Create new session
      const sessionToken = await this.sessionManager.createSession(admin.id);

      return {
        success: true,
        sessionToken,
        admin,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<ValidationResult> {
    try {
      const session = await this.sessionManager.validateSession(token);
      return {
        valid: session !== null,
        session,
      };
    } catch {
      return {
        valid: false,
        session: null,
      };
    }
  }

  /**
   * Logout and destroy session
   */
  async logout(sessionToken: string): Promise<LogoutResult> {
    try {
      const success = await this.sessionManager.destroySession(sessionToken);
      return {
        success,
      };
    } catch (error) {
      return {
        success: false,
        error: `Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Recover session after page refresh
   */
  async recoverSession(sessionToken: string): Promise<RecoveryResult> {
    try {
      const validationResult = await this.validateSession(sessionToken);
      if (!validationResult.valid || !validationResult.session) {
        return {
          success: false,
          error: 'Invalid or expired session',
        };
      }

      // Get admin data
      const admin = await this.adminRepository.findById(validationResult.session.adminId);
      if (!admin) {
        return {
          success: false,
          error: 'Admin account not found',
        };
      }

      return {
        success: true,
        admin,
      };
    } catch (error) {
      return {
        success: false,
        error: `Session recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Change admin password
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    try {
      // Find admin
      const admin = await this.adminRepository.findById(adminId);
      if (!admin) {
        return {
          success: false,
          error: 'Admin not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.verify(
        currentPassword,
        admin.password,
      );
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Validate new password complexity
      const validation = this.passwordService.validateComplexity(newPassword);
      if (!validation || !validation.valid) {
        return {
          success: false,
          error: validation?.errors?.join('; ') || 'Invalid password complexity',
        };
      }

      // Hash new password
      const hashedNewPassword = await this.passwordService.hash(newPassword);

      // Update password in database
      await this.adminRepository.updatePassword(adminId, hashedNewPassword);

      // Destroy all active sessions for security
      await this.sessionManager.destroyAllSessionsForAdmin(adminId);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password change failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if admin exists
   */
  async adminExists(username: string): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findByUsername(username);
      return admin !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get admin by session token
   */
  async getAdminBySession(sessionToken: string): Promise<Admin | null> {
    try {
      const validationResult = await this.validateSession(sessionToken);
      if (!validationResult.valid || !validationResult.session) {
        return null;
      }

      return await this.adminRepository.findById(validationResult.session.adminId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionToken: string): Promise<SessionData | null> {
    try {
      return await this.sessionManager.extendSession(sessionToken);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get session information
   */
  async getSessionInfo(sessionToken: string): Promise<SessionData | null> {
    try {
      return await this.sessionManager.getSession(sessionToken);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      return await this.sessionManager.cleanupExpiredSessions();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get authentication statistics
   */
  async getAuthStats(): Promise<{
    activeSessions: number;
    expiredToday: number;
    totalAdmins: number;
  }> {
    try {
      const sessionStats = await this.sessionManager.getSessionStats();
      const allAdmins = await this.adminRepository.getAll();

      return {
        activeSessions: sessionStats.totalActive,
        expiredToday: sessionStats.expiredToday,
        totalAdmins: allAdmins.length,
      };
    } catch (error) {
      return {
        activeSessions: 0,
        expiredToday: 0,
        totalAdmins: 0,
      };
    }
  }

  /**
   * Force logout all sessions for an admin
   */
  async forceLogoutAdmin(adminId: string): Promise<boolean> {
    try {
      return await this.sessionManager.destroyAllSessionsForAdmin(adminId);
    } catch (error) {
      return false;
    }
  }
}
