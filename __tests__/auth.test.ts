/**
 * Authentication Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthService } from '../lib/services/AuthService';
import { SessionManager } from '../lib/services/SessionManager';
import { PasswordService } from '../lib/services/PasswordService';
import { AdminRepository } from '../lib/repositories/AdminRepository';

// Mock dependencies
jest.mock('../lib/services/SessionManager');
jest.mock('../lib/services/PasswordService');
jest.mock('../lib/repositories/AdminRepository');

describe('Authentication System', () => {
  let authService: AuthService;
  let sessionManager: jest.Mocked<SessionManager>;
  let passwordService: jest.Mocked<PasswordService>;
  let adminRepository: jest.Mocked<AdminRepository>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    sessionManager = new SessionManager() as jest.Mocked<SessionManager>;
    passwordService = new PasswordService() as jest.Mocked<PasswordService>;
    adminRepository = new AdminRepository() as jest.Mocked<AdminRepository>;

    // Initialize auth service with mocked dependencies
    authService = new AuthService(sessionManager, passwordService, adminRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Admin Login', () => {
    it('should authenticate admin with valid credentials', async () => {
      // Arrange
      const validCredentials = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const mockAdmin = {
        id: 'admin-123',
        username: 'admin1',
        password: 'hashed-password',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(true);
      sessionManager.createSession.mockResolvedValue('session-token-123');

      // Act
      const result = await authService.login(validCredentials.username, validCredentials.password);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sessionToken).toBe('session-token-123');
      expect(result.admin).toEqual(mockAdmin);
      expect(adminRepository.findByUsername).toHaveBeenCalledWith('admin1');
      expect(passwordService.verify).toHaveBeenCalledWith('SecurePass123!', 'hashed-password');
      expect(sessionManager.createSession).toHaveBeenCalledWith('admin-123');
    });

    it('should reject login with invalid username', async () => {
      // Arrange
      const invalidCredentials = {
        username: 'nonexistent',
        password: 'password123'
      };

      adminRepository.findByUsername.mockResolvedValue(null);

      // Act
      const result = await authService.login(invalidCredentials.username, invalidCredentials.password);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.sessionToken).toBeUndefined();
      expect(result.admin).toBeUndefined();
      expect(passwordService.verify).not.toHaveBeenCalled();
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should reject login with invalid password', async () => {
      // Arrange
      const invalidCredentials = {
        username: 'admin1',
        password: 'wrongpassword'
      };

      const mockAdmin = {
        id: 'admin-123',
        username: 'admin1',
        password: 'hashed-password',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(false);

      // Act
      const result = await authService.login(invalidCredentials.username, invalidCredentials.password);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(result.sessionToken).toBeUndefined();
      expect(result.admin).toBeUndefined();
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it('should handle login with empty credentials', async () => {
      // Act & Assert
      await expect(authService.login('', '')).rejects.toThrow('Username and password are required');
      await expect(authService.login('admin1', '')).rejects.toThrow('Username and password are required');
      await expect(authService.login('', 'password')).rejects.toThrow('Username and password are required');
    });
  });

  describe('Session Management', () => {
    it('should create and persist session after successful login', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        username: 'admin1',
        password: 'hashed-password',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(true);
      sessionManager.createSession.mockResolvedValue('session-token-123');
      sessionManager.getSession.mockResolvedValue({
        id: 'session-123',
        token: 'session-token-123',
        adminId: 'admin-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      // Act
      await authService.login('admin1', 'SecurePass123!');
      const session = await sessionManager.getSession('session-token-123');

      // Assert
      expect(session).toBeDefined();
      expect(session.adminId).toBe('admin-123');
      expect(session.token).toBe('session-token-123');
    });

    it('should validate existing session token', async () => {
      // Arrange
      const mockSession = {
        id: 'session-123',
        token: 'valid-token',
        adminId: 'admin-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };

      sessionManager.validateSession.mockResolvedValue(mockSession);

      // Act
      const result = await authService.validateSession('valid-token');

      // Assert
      expect(result.valid).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should reject expired session token', async () => {
      // Arrange
      const expiredSession = {
        id: 'session-123',
        token: 'expired-token',
        adminId: 'admin-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date()
      };

      sessionManager.validateSession.mockResolvedValue(null);

      // Act
      const result = await authService.validateSession('expired-token');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.session).toBeNull();
    });

    it('should destroy session on logout', async () => {
      // Arrange
      const sessionToken = 'session-token-123';
      sessionManager.destroySession.mockResolvedValue(true);

      // Act
      const result = await authService.logout(sessionToken);

      // Assert
      expect(result.success).toBe(true);
      expect(sessionManager.destroySession).toHaveBeenCalledWith(sessionToken);
    });

    it('should handle session recovery after page refresh', async () => {
      // Arrange
      const sessionToken = 'recovered-token';
      const mockSession = {
        id: 'session-123',
        token: sessionToken,
        adminId: 'admin-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };

      sessionManager.validateSession.mockResolvedValue(mockSession);
      adminRepository.findById.mockResolvedValue({
        id: 'admin-123',
        username: 'admin1',
        password: 'hashed-password',
        createdAt: new Date()
      });

      // Act
      const result = await authService.recoverSession(sessionToken);

      // Assert
      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin.id).toBe('admin-123');
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity requirements', async () => {
      // Arrange
      const weakPasswords = [
        'weak',
        '123456',
        'password',
        'admin123',
        'short'
      ];

      // Act & Assert
      for (const password of weakPasswords) {
        const isValid = passwordService.validateComplexity(password);
        expect(isValid.valid).toBe(false);
        expect(isValid.errors).toContain(expect.stringMatching(/complexity|length|uppercase|lowercase|number|special/i));
      }
    });

    it('should accept strong passwords', async () => {
      // Arrange
      const strongPasswords = [
        'StrongPass123!',
        'MyS3cur3P@ssw0rd',
        'C0mpl3x!ty2024'
      ];

      // Act & Assert
      for (const password of strongPasswords) {
        const isValid = passwordService.validateComplexity(password);
        expect(isValid.valid).toBe(true);
        expect(isValid.errors).toHaveLength(0);
      }
    });

    it('should hash passwords securely', async () => {
      // Arrange
      const password = 'SecurePass123!';
      passwordService.hash.mockResolvedValue('hashed-secure-password');

      // Act
      const hashedPassword = await passwordService.hash(password);

      // Assert
      expect(hashedPassword).toBe('hashed-secure-password');
      expect(hashedPassword).not.toBe(password);
      expect(passwordService.hash).toHaveBeenCalledWith(password);
    });
  });

  describe('Multiple Admin Support', () => {
    it('should support multiple admin accounts', async () => {
      // Arrange
      const admin1 = {
        id: 'admin-1',
        username: 'admin1',
        password: 'hashed-pass-1',
        createdAt: new Date()
      };

      const admin2 = {
        id: 'admin-2',
        username: 'admin2',
        password: 'hashed-pass-2',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockImplementation((username) => {
        if (username === 'admin1') return Promise.resolve(admin1);
        if (username === 'admin2') return Promise.resolve(admin2);
        return Promise.resolve(null);
      });

      passwordService.verify.mockResolvedValue(true);
      sessionManager.createSession
        .mockResolvedValueOnce('session-token-1')
        .mockResolvedValueOnce('session-token-2');

      // Act
      const result1 = await authService.login('admin1', 'password123');
      const result2 = await authService.login('admin2', 'password456');

      // Assert
      expect(result1.success).toBe(true);
      expect(result1.admin.id).toBe('admin-1');
      expect(result1.sessionToken).toBe('session-token-1');

      expect(result2.success).toBe(true);
      expect(result2.admin.id).toBe('admin-2');
      expect(result2.sessionToken).toBe('session-token-2');
    });

    it('should prevent concurrent sessions for same admin', async () => {
      // Arrange
      const admin = {
        id: 'admin-1',
        username: 'admin1',
        password: 'hashed-pass',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(admin);
      passwordService.verify.mockResolvedValue(true);
      sessionManager.createSession.mockResolvedValue('new-session-token');
      sessionManager.getActiveSessionsForAdmin.mockResolvedValue(['existing-session']);
      sessionManager.destroySession.mockResolvedValue(true);

      // Act
      const result = await authService.login('admin1', 'password123');

      // Assert
      expect(result.success).toBe(true);
      expect(sessionManager.destroySession).toHaveBeenCalledWith('existing-session');
      expect(sessionManager.createSession).toHaveBeenCalledWith('admin-1');
    });
  });

  describe('Password Change', () => {
    it('should allow admin to change password', async () => {
      // Arrange
      const adminId = 'admin-123';
      const currentPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';

      const mockAdmin = {
        id: adminId,
        username: 'admin1',
        password: 'hashed-old-password',
        createdAt: new Date()
      };

      adminRepository.findById.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(true);
      passwordService.hash.mockResolvedValue('hashed-new-password');
      adminRepository.updatePassword.mockResolvedValue(true);

      // Act
      const result = await authService.changePassword(adminId, currentPassword, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(passwordService.verify).toHaveBeenCalledWith(currentPassword, 'hashed-old-password');
      expect(passwordService.hash).toHaveBeenCalledWith(newPassword);
      expect(adminRepository.updatePassword).toHaveBeenCalledWith(adminId, 'hashed-new-password');
    });

    it('should reject password change with invalid current password', async () => {
      // Arrange
      const adminId = 'admin-123';
      const wrongCurrentPassword = 'WrongPass123!';
      const newPassword = 'NewPass456!';

      const mockAdmin = {
        id: adminId,
        username: 'admin1',
        password: 'hashed-old-password',
        createdAt: new Date()
      };

      adminRepository.findById.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(false);

      // Act
      const result = await authService.changePassword(adminId, wrongCurrentPassword, newPassword);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Current password is incorrect');
      expect(passwordService.hash).not.toHaveBeenCalled();
      expect(adminRepository.updatePassword).not.toHaveBeenCalled();
    });

    it('should invalidate all sessions after password change', async () => {
      // Arrange
      const adminId = 'admin-123';
      const currentPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';

      const mockAdmin = {
        id: adminId,
        username: 'admin1',
        password: 'hashed-old-password',
        createdAt: new Date()
      };

      adminRepository.findById.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(true);
      passwordService.hash.mockResolvedValue('hashed-new-password');
      adminRepository.updatePassword.mockResolvedValue(true);
      sessionManager.destroyAllSessionsForAdmin.mockResolvedValue(true);

      // Act
      const result = await authService.changePassword(adminId, currentPassword, newPassword);

      // Assert
      expect(result.success).toBe(true);
      expect(sessionManager.destroyAllSessionsForAdmin).toHaveBeenCalledWith(adminId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors during login', async () => {
      // Arrange
      adminRepository.findByUsername.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(authService.login('admin1', 'password123')).rejects.toThrow('Database connection failed');
    });

    it('should handle session storage errors', async () => {
      // Arrange
      const mockAdmin = {
        id: 'admin-123',
        username: 'admin1',
        password: 'hashed-password',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(mockAdmin);
      passwordService.verify.mockResolvedValue(true);
      sessionManager.createSession.mockRejectedValue(new Error('Session storage failed'));

      // Act & Assert
      await expect(authService.login('admin1', 'password123')).rejects.toThrow('Session storage failed');
    });

    it('should handle password hashing errors', async () => {
      // Arrange
      passwordService.hash.mockRejectedValue(new Error('Hashing failed'));

      // Act & Assert
      await expect(passwordService.hash('password123')).rejects.toThrow('Hashing failed');
    });
  });
});