import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AdminService } from '../src/services/AdminService';
import { createTestApp } from './helpers/testApp';

const prisma = new PrismaClient();

describe('Admin Account Management', () => {
  let app: any;
  let adminService: AdminService;

  beforeEach(async () => {
    app = createTestApp();
    adminService = new AdminService();

    // Clean up test data
    await prisma.admin.deleteMany();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.admin.deleteMany();
  });

  describe('Admin Creation', () => {
    test('should create admin with unique username', async () => {
      const adminData = {
        username: 'testadmin',
        password: 'StrongPassword123!',
        permissions: ['ADMIN']
      };

      const response = await request(app)
        .post('/api/admin')
        .send(adminData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        username: 'testadmin',
        permissions: ['ADMIN'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(response.body.password).toBeUndefined();
    });

    test('should hash password before storing', async () => {
      const adminData = {
        username: 'testadmin',
        password: 'StrongPassword123!',
        permissions: ['ADMIN']
      };

      await request(app)
        .post('/api/admin')
        .send(adminData)
        .expect(201);

      const storedAdmin = await prisma.admin.findUnique({
        where: { username: 'testadmin' }
      });

      expect(storedAdmin?.password).not.toBe('StrongPassword123!');
      expect(storedAdmin?.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash pattern
    });

    test('should enforce username uniqueness', async () => {
      const adminData = {
        username: 'duplicate',
        password: 'StrongPassword123!',
        permissions: ['ADMIN']
      };

      // Create first admin
      await request(app)
        .post('/api/admin')
        .send(adminData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/admin')
        .send(adminData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Username already exists',
        code: 'USERNAME_TAKEN'
      });
    });

    test('should validate username requirements', async () => {
      const testCases = [
        { username: '', error: 'Username is required' },
        { username: 'ab', error: 'Username must be at least 3 characters' },
        { username: 'a'.repeat(51), error: 'Username must be less than 50 characters' },
        { username: 'admin@user', error: 'Username can only contain letters, numbers and underscores' },
        { username: '123admin', error: 'Username must start with a letter' },
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: testCase.username,
            password: 'StrongPassword123!',
            permissions: ['ADMIN']
          })
          .expect(400);

        expect(response.body.error).toContain(testCase.error);
      }
    });

    test('should assign default permissions correctly', async () => {
      const adminData = {
        username: 'testadmin',
        password: 'StrongPassword123!'
        // No permissions specified
      };

      const response = await request(app)
        .post('/api/admin')
        .send(adminData)
        .expect(201);

      expect(response.body.permissions).toEqual(['ADMIN']);
    });

    test('should validate permission assignment', async () => {
      const invalidPermissions = [
        { permissions: ['INVALID_ROLE'], error: 'Invalid permission: INVALID_ROLE' },
        { permissions: ['ADMIN', 'INVALID'], error: 'Invalid permission: INVALID' },
        { permissions: [], error: 'At least one permission is required' }
      ];

      for (const testCase of invalidPermissions) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: 'testadmin',
            password: 'StrongPassword123!',
            permissions: testCase.permissions
          })
          .expect(400);

        expect(response.body.error).toContain(testCase.error);
      }
    });

    test('should allow multiple valid permission combinations', async () => {
      const validPermissions = [
        ['ADMIN'],
        ['OPERATOR'],
        ['VIEWER'],
        ['ADMIN', 'OPERATOR'],
        ['OPERATOR', 'VIEWER']
      ];

      for (let i = 0; i < validPermissions.length; i++) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: `testadmin${i}`,
            password: 'StrongPassword123!',
            permissions: validPermissions[i]
          })
          .expect(201);

        expect(response.body.permissions).toEqual(validPermissions[i]);
      }
    });
  });

  describe('Password Validation', () => {
    test('should enforce minimum password length', async () => {
      const response = await request(app)
        .post('/api/admin')
        .send({
          username: 'testadmin',
          password: 'Short1!',
          permissions: ['ADMIN']
        })
        .expect(400);

      expect(response.body.error).toContain('Password must be at least 8 characters');
    });

    test('should require password complexity', async () => {
      const weakPasswords = [
        { password: 'password', error: 'Password must contain uppercase letter' },
        { password: 'PASSWORD', error: 'Password must contain lowercase letter' },
        { password: 'Password', error: 'Password must contain number' },
        { password: 'Password123', error: 'Password must contain special character' },
        { password: 'Pass 123!', error: 'Password cannot contain spaces' }
      ];

      for (const testCase of weakPasswords) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: 'testadmin',
            password: testCase.password,
            permissions: ['ADMIN']
          })
          .expect(400);

        expect(response.body.error).toContain(testCase.error);
      }
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = [
        'StrongPassword123!',
        'MySecure@Pass2024',
        'Complex$Password9',
        'Unbreakable#123'
      ];

      for (let i = 0; i < strongPasswords.length; i++) {
        const response = await request(app)
          .post('/api/admin')
          .send({
            username: `admin${i}`,
            password: strongPasswords[i],
            permissions: ['ADMIN']
          })
          .expect(201);

        expect(response.body.username).toBe(`admin${i}`);
      }
    });

    test('should enforce maximum password length', async () => {
      const tooLongPassword = 'a'.repeat(129) + 'A1!';

      const response = await request(app)
        .post('/api/admin')
        .send({
          username: 'testadmin',
          password: tooLongPassword,
          permissions: ['ADMIN']
        })
        .expect(400);

      expect(response.body.error).toContain('Password must be less than 128 characters');
    });
  });

  describe('Admin Retrieval', () => {
    test('should get admin by ID without password', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .get(`/api/admin/${admin.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: admin.id,
        username: 'testadmin',
        permissions: ['ADMIN'],
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      expect(response.body.password).toBeUndefined();
    });

    test('should return 404 for non-existent admin', async () => {
      const response = await request(app)
        .get('/api/admin/nonexistent-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Admin not found',
        code: 'ADMIN_NOT_FOUND'
      });
    });

    test('should list all admins without passwords', async () => {
      const admins = await Promise.all([
        prisma.admin.create({
          data: { username: 'admin1', password: '$2b$10$hash1', permissions: ['ADMIN'] }
        }),
        prisma.admin.create({
          data: { username: 'admin2', password: '$2b$10$hash2', permissions: ['OPERATOR'] }
        })
      ]);

      const response = await request(app)
        .get('/api/admin')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].password).toBeUndefined();
      expect(response.body[1].password).toBeUndefined();

      const usernames = response.body.map((admin: any) => admin.username);
      expect(usernames).toContain('admin1');
      expect(usernames).toContain('admin2');
    });
  });

  describe('Admin Updates', () => {
    test('should update admin permissions', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['VIEWER']
        }
      });

      const response = await request(app)
        .put(`/api/admin/${admin.id}`)
        .send({
          permissions: ['ADMIN', 'OPERATOR']
        })
        .expect(200);

      expect(response.body.permissions).toEqual(['ADMIN', 'OPERATOR']);
    });

    test('should not allow username updates', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .put(`/api/admin/${admin.id}`)
        .send({
          username: 'newusername'
        })
        .expect(400);

      expect(response.body.error).toContain('Username cannot be changed');
    });

    test('should validate updated permissions', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .put(`/api/admin/${admin.id}`)
        .send({
          permissions: ['INVALID_PERMISSION']
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid permission: INVALID_PERMISSION');
    });
  });

  describe('Admin Deletion', () => {
    test('should delete admin account', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      await request(app)
        .delete(`/api/admin/${admin.id}`)
        .expect(204);

      const deletedAdmin = await prisma.admin.findUnique({
        where: { id: admin.id }
      });

      expect(deletedAdmin).toBeNull();
    });

    test('should prevent deletion of last admin', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'lastadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      const response = await request(app)
        .delete(`/api/admin/${admin.id}`)
        .expect(400);

      expect(response.body.error).toContain('Cannot delete the last admin');
    });

    test('should cascade delete related sessions', async () => {
      const admin = await prisma.admin.create({
        data: {
          username: 'testadmin',
          password: '$2b$10$hashedpassword',
          permissions: ['ADMIN']
        }
      });

      await prisma.session.create({
        data: {
          userId: admin.id,
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      });

      await request(app)
        .delete(`/api/admin/${admin.id}`)
        .expect(204);

      const sessions = await prisma.session.findMany({
        where: { userId: admin.id }
      });

      expect(sessions).toHaveLength(0);
    });
  });
});