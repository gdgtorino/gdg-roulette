import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthorizationService } from '../src/services/AuthorizationService';
import { createTestApp } from './helpers/testApp';

const prisma = new PrismaClient();

describe('Admin Dashboard Access Control', () => {
  let app: any;
  let authService: AuthorizationService;

  beforeEach(async () => {
    app = createTestApp();
    authService = new AuthorizationService();

    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.event.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.event.deleteMany();
  });

  describe('Protected Route Access', () => {
    test('should block unauthenticated access to admin dashboard', async () => {
      const protectedRoutes = [
        '/api/admin/dashboard',
        '/api/admin/events',
        '/api/admin/participants',
        '/api/admin/settings',
        '/api/admin/users'
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route)
          .expect(401);

        expect(response.body).toMatchObject({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
    });

    test('should require valid session token for dashboard access', async () => {
      const invalidTokens = [
        'invalid.jwt.token',
        'Bearer invalid-token',
        'expired-token-123',
        'malformed.token.here'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.error).toContain('Invalid token');
      }
    });

    test('should reject expired session tokens', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const expiredToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    test('should validate session exists in database', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      // Create valid JWT but no database session
      const validToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '4h' }
      );

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });

    test('should allow access with valid authentication', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '4h' }
      );

      // Create session in database
      await prisma.session.create({
        data: {
          userId: admin.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        dashboard: expect.any(Object),
        admin: {
          username: 'testadmin',
          permissions: ['ADMIN']
        }
      });
    });
  });

  describe('Role-Based Permissions', () => {
    test('should enforce ADMIN permissions for admin management', async () => {
      const operator = await prisma.admin.create({
        data: {
          username: 'operator',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['OPERATOR']
        }
      });

      const token = jwt.sign(
        { adminId: operator.id, username: 'operator', permissions: ['OPERATOR'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: operator.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      const adminOnlyEndpoints = [
        { method: 'POST', path: '/api/admin' },
        { method: 'DELETE', path: '/api/admin/test-id' },
        { method: 'PUT', path: '/api/admin/test-id/permissions' }
      ];

      for (const endpoint of adminOnlyEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as keyof typeof request.app](endpoint.path)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body).toMatchObject({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: 'ADMIN'
        });
      }
    });

    test('should allow OPERATOR permissions for event management', async () => {
      const operator = await prisma.admin.create({
        data: {
          username: 'operator',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['OPERATOR']
        }
      });

      const token = jwt.sign(
        { adminId: operator.id, username: 'operator', permissions: ['OPERATOR'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: operator.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      const operatorEndpoints = [
        { method: 'GET', path: '/api/admin/events' },
        { method: 'POST', path: '/api/admin/events' },
        { method: 'PUT', path: '/api/admin/events/test-id' }
      ];

      for (const endpoint of operatorEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as keyof typeof request.app](endpoint.path)
          .set('Authorization', `Bearer ${token}`)
          .send({ name: 'Test Event' }); // Basic data for POST/PUT

        expect(response.status).not.toBe(403);
      }
    });

    test('should restrict VIEWER permissions to read-only access', async () => {
      const viewer = await prisma.admin.create({
        data: {
          username: 'viewer',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['VIEWER']
        }
      });

      const token = jwt.sign(
        { adminId: viewer.id, username: 'viewer', permissions: ['VIEWER'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: viewer.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Viewer should be able to read
      const readResponse = await request(app)
        .get('/api/admin/events')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Viewer should not be able to create/modify/delete
      const writeEndpoints = [
        { method: 'POST', path: '/api/admin/events' },
        { method: 'PUT', path: '/api/admin/events/test-id' },
        { method: 'DELETE', path: '/api/admin/events/test-id' }
      ];

      for (const endpoint of writeEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as keyof typeof request.app](endpoint.path)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.error).toContain('Insufficient permissions');
      }
    });

    test('should handle multiple permissions correctly', async () => {
      const multiRoleAdmin = await prisma.admin.create({
        data: {
          username: 'multirole',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN', 'OPERATOR']
        }
      });

      const token = jwt.sign(
        { adminId: multiRoleAdmin.id, username: 'multirole', permissions: ['ADMIN', 'OPERATOR'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: multiRoleAdmin.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Should have access to both admin and operator endpoints
      await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newadmin',
          password: 'TestPassword123!',
          permissions: ['VIEWER']
        })
        .expect(201);

      await request(app)
        .post('/api/admin/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Event'
        })
        .expect(201);
    });
  });

  describe('Unauthorized Access Blocks', () => {
    test('should block access to admin endpoints from non-admin users', async () => {
      const viewer = await prisma.admin.create({
        data: {
          username: 'viewer',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['VIEWER']
        }
      });

      const token = jwt.sign(
        { adminId: viewer.id, username: 'viewer', permissions: ['VIEWER'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: viewer.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .get('/api/admin/settings/security')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        reason: 'Admin privileges required'
      });
    });

    test('should prevent cross-tenant data access', async () => {
      const admin1 = await prisma.admin.create({
        data: {
          username: 'admin1',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const admin2 = await prisma.admin.create({
        data: {
          username: 'admin2',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const event = await prisma.event.create({
        data: {
          name: 'Private Event',
          createdBy: admin2.id,
          state: 'INIT'
        }
      });

      const token1 = jwt.sign(
        { adminId: admin1.id, username: 'admin1', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: admin1.id,
          token: token1,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Admin1 should not be able to modify Admin2's event without proper permissions
      const response = await request(app)
        .put(`/api/admin/events/${event.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({
          name: 'Modified Event'
        })
        .expect(403);

      expect(response.body.error).toContain('Access denied to resource');
    });

    test('should block direct database access attempts', async () => {
      const viewer = await prisma.admin.create({
        data: {
          username: 'viewer',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['VIEWER']
        }
      });

      const token = jwt.sign(
        { adminId: viewer.id, username: 'viewer', permissions: ['VIEWER'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: viewer.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Attempt to access raw database endpoints
      const response = await request(app)
        .get('/api/admin/database/raw')
        .set('Authorization', `Bearer ${token}`)
        .expect(404); // Should not exist or return 403

      expect([403, 404]).toContain(response.status);
    });

    test('should prevent privilege escalation through API manipulation', async () => {
      const operator = await prisma.admin.create({
        data: {
          username: 'operator',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['OPERATOR']
        }
      });

      const token = jwt.sign(
        { adminId: operator.id, username: 'operator', permissions: ['OPERATOR'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: operator.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Attempt to modify own permissions
      const response = await request(app)
        .put(`/api/admin/${operator.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          permissions: ['ADMIN']
        })
        .expect(403);

      expect(response.body.error).toContain('Cannot escalate own privileges');
    });
  });

  describe('Session Expiry Handling', () => {
    test('should redirect expired sessions to login', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      // Create expired session
      const expiredToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        redirectTo: '/admin/login'
      });
    });

    test('should handle session cleanup on expiry', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Create expired session in database
      await prisma.session.create({
        data: {
          userId: admin.id,
          token: token,
          expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
        }
      });

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      // Session should be cleaned up
      const session = await prisma.session.findFirst({
        where: { token: token }
      });

      expect(session).toBeNull();
    });

    test('should validate session against database expiry', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '4h' } // Valid JWT
      );

      // But database session is expired
      await prisma.session.create({
        data: {
          userId: admin.id,
          token: token,
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      });

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.code).toBe('SESSION_EXPIRED');
    });

    test('should handle concurrent session expiry gracefully', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      // Create multiple concurrent requests with expired sessions
      const expiredToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${expiredToken}`)
      );

      const responses = await Promise.all(requests);

      // All requests should be rejected consistently
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.code).toBe('TOKEN_EXPIRED');
      });
    });
  });

  describe('Access Control Middleware', () => {
    test('should apply rate limiting to sensitive endpoints', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: admin.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Make multiple rapid requests to sensitive endpoint
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/admin')
          .set('Authorization', `Bearer ${token}`)
          .send({
            username: `user${Math.random()}`,
            password: 'TestPassword123!',
            permissions: ['VIEWER']
          })
      );

      const responses = await Promise.all(rapidRequests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should log security events for audit trail', async () => {
      const unauthorizedAttempts = [
        { endpoint: '/api/admin/dashboard', method: 'GET' },
        { endpoint: '/api/admin/settings', method: 'PUT' },
        { endpoint: '/api/admin/users', method: 'DELETE' }
      ];

      for (const attempt of unauthorizedAttempts) {
        await request(app)
          [attempt.method.toLowerCase() as keyof typeof request.app](attempt.endpoint)
          .expect(401);
      }

      // Check that security events are logged (would need to implement logging service)
      const securityLogs = await authService.getSecurityLogs();
      expect(securityLogs.length).toBeGreaterThanOrEqual(unauthorizedAttempts.length);
    });

    test('should validate request origin and headers', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          userId: admin.id,
          token: token,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
        }
      });

      // Request from suspicious origin
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      expect(response.body.error).toContain('Invalid request origin');
    });
  });
});