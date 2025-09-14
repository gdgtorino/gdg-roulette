import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/AuthService';
import { createTestApp } from './helpers/testApp';

const prisma = new PrismaClient();

describe('Admin Authentication System', () => {
  let app: any;
  let authService: AuthService;

  beforeEach(async () => {
    app = createTestApp();
    authService = new AuthService();

    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  describe('Login Authentication', () => {
    test('should authenticate admin with valid credentials', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        admin: {
          id: admin.id,
          username: 'testadmin',
          permissions: ['ADMIN']
        },
        token: expect.any(String)
      });

      expect(response.body.admin.password).toBeUndefined();
    });

    test('should reject login with invalid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'StrongPassword123!'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    });

    test('should reject login with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    });

    test('should require both username and password', async () => {
      const testCases = [
        { username: '', password: 'password', field: 'username' },
        { username: 'admin', password: '', field: 'password' },
        { password: 'password', field: 'username' }, // missing username
        { username: 'admin', field: 'password' } // missing password
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(testCase)
          .expect(400);

        expect(response.body.error).toContain(`${testCase.field} is required`);
      }
    });

    test('should prevent brute force attacks with rate limiting', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'WrongPassword123!'
          })
          .expect(401);
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'WrongPassword123!'
        })
        .expect(429);

      expect(response.body.error).toContain('Too many login attempts');
    });

    test('should create session on successful login', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const session = await prisma.session.findFirst({
        where: { userId: admin.id }
      });

      expect(session).toBeTruthy();
      expect(session?.token).toBe(response.body.token);
      expect(session?.expiresAt).toBeInstanceOf(Date);
    });

    test('should set secure session cookie', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();

      const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('session='));
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('Secure');
      expect(sessionCookie).toContain('SameSite=Strict');
    });
  });

  describe('Session Management', () => {
    test('should validate JWT token structure', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const token = response.body.token;
      const decoded = jwt.decode(token) as any;

      expect(decoded).toMatchObject({
        adminId: admin.id,
        username: 'testadmin',
        permissions: ['ADMIN'],
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    test('should verify valid session token', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        admin: {
          username: 'testadmin',
          permissions: ['ADMIN']
        }
      });
    });

    test('should reject invalid session token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    test('should reject expired session token', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      // Create expired token
      const expiredToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authorization header required',
        code: 'MISSING_AUTH_HEADER'
      });
    });

    test('should refresh valid session before expiry', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        token: expect.any(String),
        admin: {
          username: 'testadmin',
          permissions: ['ADMIN']
        }
      });

      expect(response.body.token).not.toBe(loginResponse.body.token);
    });
  });

  describe('Session Persistence', () => {
    test('should store session in database', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const sessions = await prisma.session.findMany({
        where: { userId: admin.id }
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        userId: admin.id,
        token: expect.any(String),
        expiresAt: expect.any(Date)
      });
    });

    test('should clean up expired sessions', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      // Create expired session
      await prisma.session.create({
        data: {
          userId: admin.id,
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
        }
      });

      await request(app)
        .post('/api/auth/cleanup-sessions')
        .expect(200);

      const sessions = await prisma.session.findMany({
        where: { userId: admin.id }
      });

      expect(sessions).toHaveLength(0);
    });

    test('should limit concurrent sessions per admin', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      // Create multiple sessions (more than allowed limit of 3)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'StrongPassword123!'
          })
          .expect(200);
      }

      const sessions = await prisma.session.findMany({
        where: {
          admin: { username: 'testadmin' }
        }
      });

      expect(sessions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Logout Functionality', () => {
    test('should logout and invalidate session', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      // Session should be removed from database
      const session = await prisma.session.findUnique({
        where: { token: loginResponse.body.token }
      });

      expect(session).toBeNull();
    });

    test('should logout all sessions for admin', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      // Create multiple sessions
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'StrongPassword123!'
          })
          .expect(200);
        tokens.push(response.body.token);
      }

      await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .expect(200);

      const sessions = await prisma.session.findMany({
        where: { userId: admin.id }
      });

      expect(sessions).toHaveLength(0);
    });

    test('should clear session cookie on logout', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies?.find((cookie: string) => cookie.startsWith('session='));

      expect(sessionCookie).toContain('session=;');
      expect(sessionCookie).toContain('Max-Age=0');
    });
  });

  describe('Session Security', () => {
    test('should use secure JWT secret from environment', async () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET).toHaveLength(32); // Minimum secure length
    });

    test('should set appropriate session expiry time', async () => {
      const password = 'StrongPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'StrongPassword123!'
        })
        .expect(200);

      const session = await prisma.session.findFirst({
        where: { userId: admin.id }
      });

      const now = new Date();
      const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
      const expectedExpiry = new Date(now.getTime() + fourHours);

      expect(session?.expiresAt).toBeInstanceOf(Date);
      expect(Math.abs(session!.expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    test('should validate session token against database', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      // Create valid JWT but not stored in database
      const fakeToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '4h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    });
  });
});