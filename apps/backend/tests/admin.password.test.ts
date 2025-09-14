import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { PasswordService } from '../src/services/PasswordService';
import { createTestApp } from './helpers/testApp';

const prisma = new PrismaClient();

describe('Admin Password Management', () => {
  let app: any;
  let passwordService: PasswordService;

  beforeEach(async () => {
    app = createTestApp();
    passwordService = new PasswordService();

    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  describe('Password Change', () => {
    test('should change password with valid current password', async () => {
      const currentPassword = 'CurrentPassword123!';
      const newPassword = 'NewPassword456!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      // Login first to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: currentPassword
        })
        .expect(200);

      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          currentPassword,
          newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password updated successfully'
      });

      // Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: newPassword
        })
        .expect(200);
    });

    test('should reject password change with wrong current password', async () => {
      const currentPassword = 'CurrentPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const admin = await prisma.admin.create({
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
          password: currentPassword
        })
        .expect(200);

      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    });

    test('should require password confirmation to match', async () => {
      const currentPassword = 'CurrentPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const admin = await prisma.admin.create({
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
          password: currentPassword
        })
        .expect(200);

      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          currentPassword,
          newPassword: 'NewPassword456!',
          confirmPassword: 'DifferentPassword789!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Password confirmation does not match',
        code: 'PASSWORD_MISMATCH'
      });
    });

    test('should validate new password complexity', async () => {
      const currentPassword = 'CurrentPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const admin = await prisma.admin.create({
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
          password: currentPassword
        })
        .expect(200);

      const weakPasswords = [
        { password: 'weak', error: 'Password must be at least 8 characters' },
        { password: 'weakpassword', error: 'Password must contain uppercase letter' },
        { password: 'WEAKPASSWORD', error: 'Password must contain lowercase letter' },
        { password: 'WeakPassword', error: 'Password must contain number' },
        { password: 'WeakPassword123', error: 'Password must contain special character' }
      ];

      for (const testCase of weakPasswords) {
        const response = await request(app)
          .put('/api/admin/password')
          .set('Authorization', `Bearer ${loginResponse.body.token}`)
          .send({
            currentPassword,
            newPassword: testCase.password,
            confirmPassword: testCase.password
          })
          .expect(400);

        expect(response.body.error).toContain(testCase.error);
      }
    });

    test('should prevent using the same password', async () => {
      const currentPassword = 'CurrentPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

      const admin = await prisma.admin.create({
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
          password: currentPassword
        })
        .expect(200);

      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .send({
          currentPassword,
          newPassword: currentPassword,
          confirmPassword: currentPassword
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    });

    test('should invalidate all sessions after password change', async () => {
      const currentPassword = 'CurrentPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 10);

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
            password: currentPassword
          })
          .expect(200);
        tokens.push(response.body.token);
      }

      // Change password using first token
      await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          currentPassword,
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!'
        })
        .expect(200);

      // All sessions should be invalidated
      const sessions = await prisma.session.findMany({
        where: { userId: admin.id }
      });

      expect(sessions).toHaveLength(0);
    });
  });

  describe('Password Reset Flow', () => {
    test('should initiate password reset with valid username', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .post('/api/admin/password/reset-request')
        .send({
          username: 'testadmin'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password reset instructions sent'
      });

      // Verify reset token is created (would typically be stored in DB or sent via email)
      // For testing, we might store it in a separate table or return it
    });

    test('should reject password reset for non-existent username', async () => {
      const response = await request(app)
        .post('/api/admin/password/reset-request')
        .send({
          username: 'nonexistent'
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    });

    test('should reset password with valid reset token', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      // Generate reset token (this would typically be done by the reset-request endpoint)
      const resetToken = 'valid-reset-token-123';

      // Store reset token in database with expiry
      await prisma.cache.create({
        data: {
          key: `password_reset:${resetToken}`,
          value: { adminId: admin.id },
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      const newPassword = 'NewResetPassword123!';

      const response = await request(app)
        .post('/api/admin/password/reset')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password reset successfully'
      });

      // Verify new password works
      await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: newPassword
        })
        .expect(200);
    });

    test('should reject invalid reset token', async () => {
      const response = await request(app)
        .post('/api/admin/password/reset')
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    });

    test('should reject expired reset token', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const expiredToken = 'expired-reset-token';

      // Store expired reset token
      await prisma.cache.create({
        data: {
          key: `password_reset:${expiredToken}`,
          value: { adminId: admin.id },
          expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
        }
      });

      const response = await request(app)
        .post('/api/admin/password/reset')
        .send({
          token: expiredToken,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    });

    test('should limit reset token usage to once', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const resetToken = 'one-time-reset-token';

      await prisma.cache.create({
        data: {
          key: `password_reset:${resetToken}`,
          value: { adminId: admin.id },
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      const newPassword = 'NewPassword123!';

      // First use should succeed
      await request(app)
        .post('/api/admin/password/reset')
        .send({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword
        })
        .expect(200);

      // Second use should fail
      const response = await request(app)
        .post('/api/admin/password/reset')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword456!',
          confirmPassword: 'AnotherPassword456!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    });

    test('should rate limit password reset requests', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      // Send multiple reset requests
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/admin/password/reset-request')
          .send({
            username: 'testadmin'
          })
          .expect(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/api/admin/password/reset-request')
        .send({
          username: 'testadmin'
        })
        .expect(429);

      expect(response.body.error).toContain('Too many reset requests');
    });
  });

  describe('Password Policy Enforcement', () => {
    test('should enforce minimum password length', async () => {
      const shortPasswords = ['1234567', 'Short1!', 'Tiny2@'];

      for (const password of shortPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      }
    });

    test('should enforce maximum password length', async () => {
      const tooLongPassword = 'a'.repeat(129) + 'A1!';

      const result = passwordService.validatePassword(tooLongPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    test('should require uppercase letter', async () => {
      const noUppercasePasswords = ['password123!', 'mypassword@123', 'secret$456'];

      for (const password of noUppercasePasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain uppercase letter');
      }
    });

    test('should require lowercase letter', async () => {
      const noLowercasePasswords = ['PASSWORD123!', 'MYPASSWORD@123', 'SECRET$456'];

      for (const password of noLowercasePasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain lowercase letter');
      }
    });

    test('should require number', async () => {
      const noNumberPasswords = ['Password!', 'MyPassword@', 'Secret$Word'];

      for (const password of noNumberPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain number');
      }
    });

    test('should require special character', async () => {
      const noSpecialPasswords = ['Password123', 'MyPassword123', 'SecretWord456'];

      for (const password of noSpecialPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain special character');
      }
    });

    test('should reject passwords with spaces', async () => {
      const spacedPasswords = ['Password 123!', 'My Password@123', 'Secret Word$456'];

      for (const password of spacedPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password cannot contain spaces');
      }
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'Complex$Password9',
        'Unbreakable#123',
        'Admin$2024$Secure',
        'P@ssw0rd!Complex'
      ];

      for (const password of strongPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    test('should check password against common password list', async () => {
      const commonPasswords = [
        'Password123!',
        'Admin123!',
        'Welcome123!',
        'Login123!'
      ];

      for (const password of commonPasswords) {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password is too common');
      }
    });
  });

  describe('Old Password Verification', () => {
    test('should verify correct old password during change', async () => {
      const oldPassword = 'OldPassword123!';
      const hashedPassword = await bcrypt.hash(oldPassword, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const isValid = await passwordService.verifyOldPassword(admin.id, oldPassword);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect old password', async () => {
      const oldPassword = 'OldPassword123!';
      const hashedPassword = await bcrypt.hash(oldPassword, 10);

      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: hashedPassword,
          permissions: ['ADMIN']
        }
      });

      const isValid = await passwordService.verifyOldPassword(admin.id, 'WrongPassword123!');
      expect(isValid).toBe(false);
    });

    test('should require current password for admin-initiated password change', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testadmin',
          password: 'somepassword' // This would need to match the actual password
        });

      const response = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${loginResponse.body?.token || 'fake-token'}`)
        .send({
          // Missing currentPassword
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.error).toContain('Current password is required');
    });
  });
});