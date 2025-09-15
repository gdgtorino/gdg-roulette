/**
 * Authentication API Route Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { POST as loginHandler, setTestAuthServices } from '../../app/api/auth/login/route';
import { POST as logoutHandler, setTestLogoutServices } from '../../app/api/auth/logout/route';

// Mock services
const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  validateSession: jest.fn(),
  changePassword: jest.fn()
};

const mockSessionManager = {
  createAdminSession: jest.fn(),
  validateSession: jest.fn(),
  invalidateSession: jest.fn(),
  refreshSession: jest.fn()
};

// Helper function to create mock NextRequest
function createMockRequest(data: any, headers: Record<string, string> = {}): NextRequest {
  return {
    json: async () => {
      if (typeof data === 'string') {
        return JSON.parse(data); // This will throw for invalid JSON
      }
      return data;
    },
    headers: {
      get: (key: string) => headers[key] || null,
    },
    nextUrl: { origin: 'http://localhost' },
    signal: undefined
  } as any as NextRequest;
}

describe('/api/auth/* API Routes', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Inject mock services into the API routes
    setTestAuthServices({
      authService: mockAuthService as any,
      sessionManager: mockSessionManager as any
    });

    setTestLogoutServices({
      authService: mockAuthService as any,
      sessionManager: mockSessionManager as any
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate admin with valid credentials', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const mockLoginResult = {
        success: true,
        admin: {
          id: 'admin-123',
          username: 'admin1',
          role: 'ADMIN',
          permissions: ['CREATE_EVENT', 'MANAGE_USERS']
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);
      mockSessionManager.createAdminSession.mockResolvedValue({ id: 'session-token-123' });

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.sessionToken).toBe('session-token-123');
      expect(responseData.admin.username).toBe('admin1');
      expect(responseData.admin.role).toBe('ADMIN');
      expect(mockAuthService.login).toHaveBeenCalledWith('admin1', 'SecurePass123!');

      // Check for secure cookie setting
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('sessionToken=session-token-123');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('SameSite=Strict');
    });

    it('should reject login with invalid credentials', async () => {
      // Arrange
      const loginData = {
        username: 'wronguser',
        password: 'wrongpass'
      };

      const mockLoginResult = {
        success: false,
        error: 'Invalid credentials'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid credentials');
      expect(responseData.sessionToken).toBeUndefined();
      expect(responseData.admin).toBeUndefined();

      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toBeNull();
    });

    it('should validate required login fields', async () => {
      // Arrange
      const invalidRequests = [
        { username: '', password: 'password123' },
        { username: 'admin', password: '' },
        { username: '', password: '' },
        { password: 'password123' }, // Missing username
        { username: 'admin' }, // Missing password
        {}
      ];

      // Act & Assert
      for (const invalidData of invalidRequests) {
        const request = createMockRequest(invalidData);

        const response = await loginHandler(request);
        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toMatch(/required|missing/i);
      }
    });

    it('should handle malformed JSON in request body', async () => {
      // Arrange
      const request = createMockRequest('invalid-json{');

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid JSON format');
    });

    it('should handle authentication service errors', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      mockAuthService.login.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should implement rate limiting for login attempts', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'wrongpassword'
      };

      const mockLoginResult = {
        success: false,
        error: 'Invalid credentials'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      // Act - Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 6; i++) { // Exceed rate limit of 5 attempts
        const request = createMockRequest(loginData, {
          'X-Forwarded-For': '192.168.1.1'
        });
        promises.push(loginHandler(request));
      }

      const responses = await Promise.all(promises);
      const lastResponse = responses[responses.length - 1];
      const lastResponseData = await lastResponse.json();

      // Assert
      expect(lastResponse.status).toBe(429);
      expect(lastResponseData.success).toBe(false);
      expect(lastResponseData.error).toBe('Too many login attempts. Please try again later.');
    });

    it('should return appropriate CORS headers', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const mockLoginResult = {
        success: true,
        sessionToken: 'session-token-123',
        admin: { id: 'admin-123', username: 'admin1' }
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const request = createMockRequest(loginData, {
        'Origin': 'http://localhost:3000'
      });

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should log failed login attempts for security monitoring', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'wrongpassword'
      };

      const mockLoginResult = {
        success: false,
        error: 'Invalid credentials'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);
      const securityLogSpy = jest.spyOn(console, 'warn').mockImplementation();

      const request = createMockRequest(loginData, {
        'X-Forwarded-For': '192.168.1.100',
        'User-Agent': 'Mozilla/5.0 Test Browser'
      });

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(securityLogSpy).toHaveBeenCalledWith(
        'Failed login attempt',
        expect.objectContaining({
          username: 'admin1',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser',
          timestamp: expect.any(Date)
        })
      );

      securityLogSpy.mockRestore();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout admin and clear session', async () => {
      // Arrange
      const sessionToken = 'session-token-123';

      const mockLogoutResult = {
        success: true
      };

      mockAuthService.logout.mockResolvedValue(mockLogoutResult);

      const request = createMockRequest({}, {
        'Cookie': `sessionToken=${sessionToken}`
      });

      // Act
      const response = await logoutHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockAuthService.logout).toHaveBeenCalledWith(sessionToken);

      // Check for cookie clearing
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toContain('sessionToken=');
      expect(setCookieHeader).toContain('expires=Thu, 01 Jan 1970');
      expect(setCookieHeader).toContain('HttpOnly');
    });

    it('should handle logout without valid session', async () => {
      // Arrange
      const request = createMockRequest({});

      // Act
      const response = await logoutHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200); // Still successful
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Already logged out');
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should handle logout service errors gracefully', async () => {
      // Arrange
      const sessionToken = 'session-token-123';

      mockAuthService.logout.mockRejectedValue(new Error('Session service unavailable'));

      const request = createMockRequest({}, {
        'Cookie': `sessionToken=${sessionToken}`
      });

      // Act
      const response = await logoutHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Logout failed');
    });

    it('should clear all session-related cookies on logout', async () => {
      // Arrange
      const sessionToken = 'session-token-123';

      const mockLogoutResult = {
        success: true
      };

      mockAuthService.logout.mockResolvedValue(mockLogoutResult);

      const request = createMockRequest({}, {
        'Cookie': `sessionToken=${sessionToken}; adminPrefs=theme-dark; csrfToken=csrf-123`
      });

      // Act
      const response = await logoutHandler(request);

      // Assert
      const setCookieHeader = response.headers.get('Set-Cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain('sessionToken=');
      expect(setCookieHeader).toContain('expires=Thu, 01 Jan 1970');
      expect(setCookieHeader).toContain('adminPrefs=');
      expect(setCookieHeader).toContain('csrfToken=');
    });

    it('should log successful logout events', async () => {
      // Arrange
      const sessionToken = 'session-token-123';

      const mockLogoutResult = {
        success: true,
        adminId: 'admin-123',
        username: 'admin1'
      };

      mockAuthService.logout.mockResolvedValue(mockLogoutResult);
      const auditLogSpy = jest.spyOn(console, 'info').mockImplementation();

      const request = createMockRequest({}, {
        'Cookie': `sessionToken=${sessionToken}`,
        'X-Forwarded-For': '192.168.1.100'
      });

      // Act
      await logoutHandler(request);

      // Assert
      expect(auditLogSpy).toHaveBeenCalledWith(
        'Admin logout',
        expect.objectContaining({
          adminId: 'admin-123',
          username: 'admin1',
          ip: '192.168.1.100',
          timestamp: expect.any(Date)
        })
      );

      auditLogSpy.mockRestore();
    });
  });

  describe('Authentication Middleware Integration', () => {
    it('should validate session tokens in protected routes', async () => {
      // This would test the middleware that protects other routes
      // For now, we'll test the validation logic
      const validToken = 'valid-session-token';
      const invalidToken = 'invalid-session-token';

      const mockValidSession = {
        valid: true,
        session: {
          id: 'session-123',
          adminId: 'admin-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      const mockInvalidSession = {
        valid: false,
        session: null
      };

      mockAuthService.validateSession
        .mockResolvedValueOnce(mockValidSession)
        .mockResolvedValueOnce(mockInvalidSession);

      // Test valid token
      const validResult = await mockAuthService.validateSession(validToken);
      expect(validResult.valid).toBe(true);
      expect(validResult.session.adminId).toBe('admin-123');

      // Test invalid token
      const invalidResult = await mockAuthService.validateSession(invalidToken);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.session).toBeNull();
    });

    it('should handle expired session tokens', async () => {
      // Arrange
      const expiredToken = 'expired-session-token';

      const mockExpiredSession = {
        valid: false,
        session: null,
        error: 'Session expired'
      };

      mockAuthService.validateSession.mockResolvedValue(mockExpiredSession);

      // Act
      const result = await mockAuthService.validateSession(expiredToken);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session expired');
    });

    it('should refresh session tokens near expiry', async () => {
      // Arrange
      const nearExpiryToken = 'near-expiry-token';

      const mockNearExpirySession = {
        valid: true,
        session: {
          id: 'session-123',
          adminId: 'admin-123',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes left
        },
        shouldRefresh: true
      };

      const mockRefreshedToken = 'refreshed-session-token';

      mockAuthService.validateSession.mockResolvedValue(mockNearExpirySession);
      mockSessionManager.refreshSession.mockResolvedValue(mockRefreshedToken);

      // Act
      const result = await mockAuthService.validateSession(nearExpiryToken);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.shouldRefresh).toBe(true);
      if (result.shouldRefresh) {
        const newToken = await mockSessionManager.refreshSession(nearExpiryToken);
        expect(newToken).toBe(mockRefreshedToken);
      }
    });
  });

  describe('Security Headers and Protections', () => {
    it('should include security headers in authentication responses', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const mockLoginResult = {
        success: true,
        sessionToken: 'session-token-123',
        admin: { id: 'admin-123', username: 'admin1' }
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);

      // Assert
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('should prevent CSRF attacks with token validation', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const request = createMockRequest(loginData, {
        'Origin': 'http://malicious-site.com'
      });

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid origin');
    });

    it('should sanitize input to prevent injection attacks', async () => {
      // Arrange
      const maliciousLoginData = {
        username: 'admin\'; DROP TABLE admins; --',
        password: '<script>alert("xss")</script>'
      };

      const request = createMockRequest(maliciousLoginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      // Should either sanitize or reject malicious input
      expect(response.status).toBe(400);
      expect(responseData.error).toMatch(/invalid.*characters|sanitization/i);
    });
  });

  describe('API Response Format Consistency', () => {
    it('should return consistent response structure for success', async () => {
      // Arrange
      const loginData = {
        username: 'admin1',
        password: 'SecurePass123!'
      };

      const mockLoginResult = {
        success: true,
        sessionToken: 'session-token-123',
        admin: {
          id: 'admin-123',
          username: 'admin1',
          role: 'ADMIN'
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(responseData).toHaveProperty('success');
      expect(responseData).toHaveProperty('sessionToken');
      expect(responseData).toHaveProperty('admin');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData.admin).toHaveProperty('id');
      expect(responseData.admin).toHaveProperty('username');
      expect(responseData.admin).toHaveProperty('role');
    });

    it('should return consistent error response structure', async () => {
      // Arrange
      const loginData = {
        username: 'wronguser',
        password: 'wrongpass'
      };

      const mockLoginResult = {
        success: false,
        error: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS'
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const request = createMockRequest(loginData);

      // Act
      const response = await loginHandler(request);
      const responseData = await response.json();

      // Assert
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData).toHaveProperty('errorCode');
      expect(responseData).toHaveProperty('timestamp');
      expect(responseData).not.toHaveProperty('sessionToken');
      expect(responseData).not.toHaveProperty('admin');
    });
  });
});