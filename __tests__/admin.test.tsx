/**
 * Admin Management Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminService } from '../lib/services/AdminService';
import { AdminRepository } from '../lib/repositories/AdminRepository';
import { PasswordService } from '../lib/services/PasswordService';
import { PermissionService } from '../lib/services/PermissionService';
import { EventService } from '../lib/services/EventService';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { CreateAdminForm } from '../components/admin/CreateAdminForm';

// Mock dependencies
jest.mock('../lib/repositories/AdminRepository');
jest.mock('../lib/services/PasswordService');
jest.mock('../lib/services/PermissionService');
jest.mock('../lib/services/EventService');

describe('Admin Management System', () => {
  let adminService: AdminService;
  let adminRepository: jest.Mocked<AdminRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let permissionService: jest.Mocked<PermissionService>;
  let eventService: jest.Mocked<EventService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mocked instances
    adminRepository = new AdminRepository() as jest.Mocked<AdminRepository>;
    passwordService = new PasswordService() as jest.Mocked<PasswordService>;
    permissionService = new PermissionService() as jest.Mocked<PermissionService>;
    eventService = new EventService() as jest.Mocked<EventService>;

    // Common mock setups that most tests need
    setupCommonMocks();

    // Initialize admin service
    adminService = new AdminService(
      adminRepository,
      passwordService,
      permissionService,
      eventService
    );
  });

  function setupCommonMocks() {
    // Mock creator admin exists (most tests use this)
    const defaultCreatorAdmin = {
      id: 'creator-123',
      username: 'creator',
      role: 'SUPER_ADMIN',
      permissions: ['MANAGE_USERS']
    };
    adminRepository.findById.mockResolvedValue(defaultCreatorAdmin);

    // Common repository mocks - only set defaults that most tests need
    adminRepository.findByUsername.mockResolvedValue(null);
    adminRepository.findByEmail.mockResolvedValue(null);

    // Common service mocks - set basic defaults, let individual tests override
    passwordService.hash.mockResolvedValue('hashed-password');
    permissionService.hasPermission.mockReturnValue(true);
    // Don't set a default for getDefaultPermissions - let each test set its own
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Create New Admin Accounts', () => {
    it('should create new admin with valid data', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        password: 'SecurePass123!',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      const hashedPassword = 'hashed-secure-password';
      const createdAdmin = {
        id: 'admin-123',
        username: 'newadmin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date(),
        isActive: true,
        permissions: ['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']
      };

      // Override specific mocks for this test
      passwordService.hash.mockResolvedValue(hashedPassword);
      permissionService.getDefaultPermissions.mockReturnValue(['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']);
      adminRepository.create.mockResolvedValue(createdAdmin);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-admin-id');

      // Assert
      expect(result.success).toBe(true);
      expect(result.admin).toEqual(createdAdmin);
      expect(adminRepository.findByUsername).toHaveBeenCalledWith('newadmin');
      expect(adminRepository.findByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(passwordService.hash).toHaveBeenCalledWith('SecurePass123!');
      expect(adminRepository.create).toHaveBeenCalledWith({
        username: 'newadmin',
        password: hashedPassword,
        email: 'admin@example.com',
        role: 'ADMIN',
        createdBy: 'creator-admin-id',
        permissions: ['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']
      });
    });

    it('should validate admin creation permissions', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        password: 'SecurePass123!',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      const creatorAdmin = {
        id: 'creator-123',
        username: 'creator',
        role: 'ADMIN',
        permissions: ['CREATE_EVENT'] // Missing MANAGE_USERS permission
      };

      adminRepository.findById.mockResolvedValue(creatorAdmin);
      permissionService.hasPermission.mockReturnValue(false);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create admin accounts');
      expect(adminRepository.create).not.toHaveBeenCalled();
    });

    it('should assign different admin roles with varying permissions', async () => {
      // Arrange
      const superAdminData = {
        username: 'superadmin',
        password: 'SecurePass123!',
        email: 'super@example.com',
        role: 'SUPER_ADMIN'
      };

      const regularAdminData = {
        username: 'regularadmin',
        password: 'SecurePass123!',
        email: 'regular@example.com',
        role: 'ADMIN'
      };

      const moderatorData = {
        username: 'moderator',
        password: 'SecurePass123!',
        email: 'mod@example.com',
        role: 'MODERATOR'
      };

      permissionService.getDefaultPermissions
        .mockReturnValueOnce(['*']) // Super admin gets all permissions
        .mockReturnValueOnce(['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']) // Regular admin
        .mockReturnValueOnce(['VIEW_EVENTS', 'VIEW_ANALYTICS']); // Moderator

      permissionService.hasPermission.mockReturnValue(true);

      // Mock adminRepository.create to return admin with permissions that match getDefaultPermissions calls
      adminRepository.create
        .mockImplementationOnce(async (data) => ({
          id: 'super-admin-123',
          username: data.username,
          role: data.role,
          permissions: data.permissions, // Use the permissions passed from the service
          createdAt: new Date()
        }))
        .mockImplementationOnce(async (data) => ({
          id: 'admin-123',
          username: data.username,
          role: data.role,
          permissions: data.permissions,
          createdAt: new Date()
        }))
        .mockImplementationOnce(async (data) => ({
          id: 'mod-123',
          username: data.username,
          role: data.role,
          permissions: data.permissions,
          createdAt: new Date()
        }));

      // Act
      const superResult = await adminService.createAdmin(superAdminData, 'creator-123');
      const adminResult = await adminService.createAdmin(regularAdminData, 'creator-123');
      const modResult = await adminService.createAdmin(moderatorData, 'creator-123');

      // Assert
      expect(superResult.admin.permissions).toEqual(['*']);
      expect(adminResult.admin.permissions).toEqual(['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']);
      expect(modResult.admin.permissions).toEqual(['VIEW_EVENTS', 'VIEW_ANALYTICS']);
    });

    it('should validate admin data before creation', async () => {
      // Arrange
      const invalidData = [
        { username: '', password: 'SecurePass123!', email: 'test@example.com' }, // Empty username
        { username: 'admin', password: 'weak', email: 'test@example.com' }, // Weak password
        { username: 'admin', password: 'SecurePass123!', email: 'invalid-email' }, // Invalid email
        { username: 'a'.repeat(51), password: 'SecurePass123!', email: 'test@example.com' }, // Username too long
      ];

      // Act & Assert
      for (const data of invalidData) {
        const result = await adminService.createAdmin(data, 'creator-123');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/validation|invalid|required|format/i);
      }

      expect(adminRepository.create).not.toHaveBeenCalled();
    });

    it('should log admin creation activities', async () => {
      // Arrange
      const adminData = {
        username: 'audited-admin',
        password: 'SecurePass123!',
        email: 'audited@example.com',
        role: 'ADMIN'
      };

      adminRepository.findByUsername.mockResolvedValue(null);
      adminRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      permissionService.getDefaultPermissions.mockReturnValue(['CREATE_EVENT']);
      permissionService.hasPermission.mockReturnValue(true);

      adminRepository.create.mockResolvedValue({
        id: 'admin-123',
        username: 'audited-admin',
        role: 'ADMIN',
        createdAt: new Date()
      });

      const auditLogSpy = jest.spyOn(adminService, 'logActivity');

      // Act
      await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(auditLogSpy).toHaveBeenCalledWith({
        action: 'ADMIN_CREATED',
        performedBy: 'creator-123',
        targetAdmin: 'admin-123',
        details: {
          username: 'audited-admin',
          role: 'ADMIN',
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('Username Uniqueness Validation', () => {
    it('should reject duplicate usernames', async () => {
      // Arrange
      const adminData = {
        username: 'existing-admin',
        password: 'SecurePass123!',
        email: 'new@example.com',
        role: 'ADMIN'
      };

      const existingAdmin = {
        id: 'existing-123',
        username: 'existing-admin',
        email: 'existing@example.com',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(existingAdmin);
      permissionService.hasPermission.mockReturnValue(true);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Username already exists');
      expect(adminRepository.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate email addresses', async () => {
      // Arrange
      const adminData = {
        username: 'new-admin',
        password: 'SecurePass123!',
        email: 'existing@example.com',
        role: 'ADMIN'
      };

      const existingAdmin = {
        id: 'existing-123',
        username: 'existing-admin',
        email: 'existing@example.com',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(null);
      adminRepository.findByEmail.mockResolvedValue(existingAdmin);
      permissionService.hasPermission.mockReturnValue(true);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email address already registered');
      expect(adminRepository.create).not.toHaveBeenCalled();
    });

    it('should allow case-sensitive username uniqueness', async () => {
      // Arrange
      const adminData1 = {
        username: 'Admin',
        password: 'SecurePass123!',
        email: 'admin1@example.com',
        role: 'ADMIN'
      };

      const adminData2 = {
        username: 'admin',
        password: 'SecurePass123!',
        email: 'admin2@example.com',
        role: 'ADMIN'
      };

      adminRepository.findByUsername.mockResolvedValue(null);
      adminRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      permissionService.getDefaultPermissions.mockReturnValue(['CREATE_EVENT']);
      permissionService.hasPermission.mockReturnValue(true);

      adminRepository.create
        .mockResolvedValueOnce({
          id: 'admin-1',
          username: 'Admin',
          email: 'admin1@example.com',
          createdAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'admin-2',
          username: 'admin',
          email: 'admin2@example.com',
          createdAt: new Date()
        });

      // Act
      const result1 = await adminService.createAdmin(adminData1, 'creator-123');
      const result2 = await adminService.createAdmin(adminData2, 'creator-123');

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.admin.username).toBe('Admin');
      expect(result2.admin.username).toBe('admin');
    });

    it('should trim whitespace from usernames and emails', async () => {
      // Arrange
      const adminData = {
        username: '  trimmed-admin  ',
        password: 'SecurePass123!',
        email: '  trimmed@example.com  ',
        role: 'ADMIN'
      };

      adminRepository.findByUsername.mockImplementation((username) => {
        expect(username).toBe('trimmed-admin'); // Should be trimmed
        return Promise.resolve(null);
      });

      adminRepository.findByEmail.mockImplementation((email) => {
        expect(email).toBe('trimmed@example.com'); // Should be trimmed
        return Promise.resolve(null);
      });

      passwordService.hash.mockResolvedValue('hashed-password');
      permissionService.getDefaultPermissions.mockReturnValue(['CREATE_EVENT']);
      permissionService.hasPermission.mockReturnValue(true);

      adminRepository.create.mockResolvedValue({
        id: 'admin-123',
        username: 'trimmed-admin',
        email: 'trimmed@example.com',
        createdAt: new Date()
      });

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.admin.username).toBe('trimmed-admin');
      expect(result.admin.email).toBe('trimmed@example.com');
    });
  });

  describe('Permission Assignment and Checking', () => {
    it('should check specific permissions for admin actions', async () => {
      // Arrange
      const adminId = 'admin-123';
      const requiredPermissions = ['CREATE_EVENT', 'MANAGE_USERS', 'DELETE_EVENT'];

      const admin = {
        id: adminId,
        username: 'test-admin',
        permissions: ['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']
      };

      adminRepository.findById.mockResolvedValue(admin);

      permissionService.hasPermission
        .mockReturnValueOnce(true)  // CREATE_EVENT
        .mockReturnValueOnce(true)  // MANAGE_USERS
        .mockReturnValueOnce(false); // DELETE_EVENT

      // Act
      const canCreate = await adminService.hasPermission(adminId, 'CREATE_EVENT');
      const canManage = await adminService.hasPermission(adminId, 'MANAGE_USERS');
      const canDelete = await adminService.hasPermission(adminId, 'DELETE_EVENT');

      // Assert
      expect(canCreate).toBe(true);
      expect(canManage).toBe(true);
      expect(canDelete).toBe(false);
    });

    it('should support hierarchical permission inheritance', async () => {
      // Arrange
      const superAdminId = 'super-admin-123';
      const adminId = 'admin-123';
      const moderatorId = 'moderator-123';

      const superAdmin = {
        id: superAdminId,
        username: 'super-admin',
        role: 'SUPER_ADMIN',
        permissions: ['*'] // All permissions
      };

      const admin = {
        id: adminId,
        username: 'admin',
        role: 'ADMIN',
        permissions: ['CREATE_EVENT', 'MANAGE_USERS']
      };

      const moderator = {
        id: moderatorId,
        username: 'moderator',
        role: 'MODERATOR',
        permissions: ['VIEW_EVENTS']
      };

      adminRepository.findById
        .mockResolvedValueOnce(superAdmin)
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce(moderator);

      permissionService.hasPermission.mockImplementation((permissions, permission) => {
        if (permissions.includes('*')) return true; // Super admin
        return permissions.includes(permission);
      });

      // Act
      const superCanDelete = await adminService.hasPermission(superAdminId, 'DELETE_EVENT');
      const adminCanDelete = await adminService.hasPermission(adminId, 'DELETE_EVENT');
      const modCanDelete = await adminService.hasPermission(moderatorId, 'DELETE_EVENT');

      // Assert
      expect(superCanDelete).toBe(true);  // Super admin can do everything
      expect(adminCanDelete).toBe(false); // Admin doesn't have DELETE_EVENT
      expect(modCanDelete).toBe(false);   // Moderator doesn't have DELETE_EVENT
    });

    it('should update admin permissions dynamically', async () => {
      // Arrange
      const adminId = 'admin-123';
      const newPermissions = ['CREATE_EVENT', 'MANAGE_USERS', 'DELETE_EVENT', 'VIEW_ANALYTICS'];

      const existingAdmin = {
        id: adminId,
        username: 'admin',
        permissions: ['CREATE_EVENT', 'VIEW_ANALYTICS']
      };

      // Mock the admin being updated
      adminRepository.findById.mockResolvedValueOnce(existingAdmin);
      // Mock the modifier admin
      adminRepository.findById.mockResolvedValueOnce({ id: 'modifier-admin-id', permissions: ['*'] });
      permissionService.canGrantPermission.mockReturnValue(true); // Modifier can grant all permissions
      permissionService.validatePermissions.mockReturnValue({ valid: true, errors: [] });

      adminRepository.updatePermissions.mockResolvedValue({
        ...existingAdmin,
        permissions: newPermissions,
        updatedAt: new Date()
      });

      // Act
      const result = await adminService.updatePermissions(adminId, newPermissions, 'modifier-admin-id');

      // Assert
      expect(result.success).toBe(true);
      expect(result.admin.permissions).toEqual(newPermissions);
      expect(adminRepository.updatePermissions).toHaveBeenCalledWith(adminId, newPermissions);
    });

    it('should prevent permission escalation attacks', async () => {
      // Arrange
      const adminId = 'admin-123';
      const attackerAdminId = 'attacker-123';
      const escalatedPermissions = ['*']; // Trying to grant super admin permissions

      const attacker = {
        id: attackerAdminId,
        username: 'attacker',
        role: 'ADMIN',
        permissions: ['CREATE_EVENT', 'MANAGE_USERS']
      };

      adminRepository.findById.mockResolvedValue(attacker);
      permissionService.hasPermission.mockReturnValue(false); // Doesn't have permission to grant '*'
      permissionService.canGrantPermission.mockReturnValue(false);

      // Act
      const result = await adminService.updatePermissions(adminId, escalatedPermissions, attackerAdminId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot grant permissions higher than your own');
      expect(adminRepository.updatePermissions).not.toHaveBeenCalled();
    });

    it('should validate permission combinations', async () => {
      // Arrange
      const adminId = 'admin-123';
      const conflictingPermissions = ['CREATE_EVENT', 'DELETE_ALL_EVENTS', 'READ_ONLY_MODE'];

      // Mock the admin being updated
      adminRepository.findById.mockResolvedValueOnce({ id: adminId, permissions: [] });
      // Mock the modifier admin
      adminRepository.findById.mockResolvedValueOnce({ id: 'modifier-123', permissions: ['*'] });
      permissionService.canGrantPermission.mockReturnValue(true); // Modifier can grant permissions
      permissionService.validatePermissions.mockReturnValue({
        valid: false,
        errors: ['Cannot combine DELETE_ALL_EVENTS with READ_ONLY_MODE']
      });

      // Act
      const result = await adminService.updatePermissions(adminId, conflictingPermissions, 'modifier-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot combine DELETE_ALL_EVENTS with READ_ONLY_MODE');
    });
  });

  describe('Admin Dashboard Functionality', () => {
    it('should display admin dashboard with proper sections', () => {
      // Arrange
      const currentAdmin = {
        id: 'admin-123',
        username: 'test-admin',
        role: 'ADMIN',
        permissions: ['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS']
      };

      const dashboardData = {
        totalEvents: 15,
        activeEvents: 3,
        totalParticipants: 1250,
        recentActivities: [
          { id: '1', action: 'Event Created', timestamp: new Date(), user: 'admin1' },
          { id: '2', action: 'User Registered', timestamp: new Date(), user: 'participant1' }
        ]
      };

      // Act
      render(<AdminDashboard admin={currentAdmin} data={dashboardData} />);

      // Assert
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome, test-admin')).toBeInTheDocument();
      expect(screen.getByText('Total Events: 15')).toBeInTheDocument();
      expect(screen.getByText('Active Events: 3')).toBeInTheDocument();
      expect(screen.getByText('Total Participants: 1,250')).toBeInTheDocument();
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();
    });

    it('should show different dashboard sections based on permissions', () => {
      // Arrange
      const superAdmin = {
        id: 'super-123',
        username: 'super-admin',
        role: 'SUPER_ADMIN',
        permissions: ['*']
      };

      const regularAdmin = {
        id: 'admin-123',
        username: 'admin',
        role: 'ADMIN',
        permissions: ['CREATE_EVENT', 'VIEW_ANALYTICS']
      };

      const moderator = {
        id: 'mod-123',
        username: 'moderator',
        role: 'MODERATOR',
        permissions: ['VIEW_EVENTS']
      };

      // Act
      const { rerender } = render(<AdminDashboard admin={superAdmin} />);
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();

      rerender(<AdminDashboard admin={regularAdmin} />);
      expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
      expect(screen.queryByText('User Management')).not.toBeInTheDocument();

      rerender(<AdminDashboard admin={moderator} />);
      expect(screen.queryByText('Create Event')).not.toBeInTheDocument();
      expect(screen.getByText('View Events')).toBeInTheDocument();
    });

    it('should handle dashboard data loading states', async () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        username: 'admin',
        permissions: ['VIEW_ANALYTICS']
      };

      const loadDashboardData = jest.fn(() =>
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      // Act
      render(<AdminDashboard admin={admin} onLoadData={loadDashboardData} />);

      // Assert
      expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
      expect(loadDashboardData).toHaveBeenCalled();
    });

    it('should display error messages for failed dashboard operations', async () => {
      // Arrange
      const admin = {
        id: 'admin-123',
        username: 'admin',
        permissions: ['CREATE_EVENT']
      };

      const failingOperation = jest.fn(() =>
        Promise.reject(new Error('Failed to create event'))
      );

      // Act
      render(<AdminDashboard admin={admin} onCreateEvent={failingOperation} />);

      const createButton = screen.getByRole('button', { name: /create event/i });
      fireEvent.click(createButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/failed to create event/i)).toBeInTheDocument();
      });
    });
  });

  describe('Event Management Operations', () => {
    it('should allow admin to create events with proper permissions', async () => {
      // Arrange
      const adminId = 'admin-123';
      const eventData = {
        name: 'New Test Event',
        description: 'Test event description',
        maxParticipants: 100
      };

      const admin = {
        id: adminId,
        username: 'admin',
        permissions: ['CREATE_EVENT']
      };

      const createdEvent = {
        id: 'event-123',
        name: 'New Test Event',
        createdBy: adminId,
        createdAt: new Date(),
        state: 'INIT'
      };

      adminRepository.findById.mockResolvedValue(admin);
      permissionService.hasPermission.mockReturnValue(true);
      eventService.createEvent.mockResolvedValue(createdEvent);

      // Act
      const result = await adminService.createEvent(eventData, adminId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.event).toEqual(createdEvent);
      expect(eventService.createEvent).toHaveBeenCalledWith({
        ...eventData,
        createdBy: adminId
      });
    });

    it('should list events with admin-specific visibility', async () => {
      // Arrange
      const adminId = 'admin-123';
      const admin = {
        id: adminId,
        username: 'admin',
        role: 'ADMIN',
        permissions: ['VIEW_EVENTS']
      };

      const allEvents = [
        { id: 'e1', name: 'Event 1', createdBy: adminId, state: 'REGISTRATION' },
        { id: 'e2', name: 'Event 2', createdBy: 'other-admin', state: 'DRAW' },
        { id: 'e3', name: 'Event 3', createdBy: adminId, state: 'CLOSED' }
      ];

      adminRepository.findById.mockResolvedValue(admin);
      permissionService.hasPermission.mockReturnValue(false); // Regular admin, can't view all events
      eventService.getEventsForAdmin.mockResolvedValue(allEvents.filter(e => e.createdBy === adminId));

      // Act
      const result = await adminService.getEventsForAdmin(adminId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(2); // Only admin's events
      expect(result.events.every(e => e.createdBy === adminId)).toBe(true);
    });

    it('should allow super admin to view all events', async () => {
      // Arrange
      const superAdminId = 'super-123';
      const superAdmin = {
        id: superAdminId,
        username: 'super-admin',
        role: 'SUPER_ADMIN',
        permissions: ['*']
      };

      const allEvents = [
        { id: 'e1', name: 'Event 1', createdBy: 'admin1', state: 'REGISTRATION' },
        { id: 'e2', name: 'Event 2', createdBy: 'admin2', state: 'DRAW' },
        { id: 'e3', name: 'Event 3', createdBy: 'admin3', state: 'CLOSED' }
      ];

      adminRepository.findById.mockResolvedValue(superAdmin);
      permissionService.hasPermission.mockReturnValue(true);
      eventService.getAllEvents.mockResolvedValue(allEvents);

      // Act
      const result = await adminService.getEventsForAdmin(superAdminId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(3); // All events visible to super admin
    });

    it('should enforce event modification permissions', async () => {
      // Arrange
      const adminId = 'admin-123';
      const eventId = 'event-456';
      const updateData = { name: 'Updated Event Name' };

      const admin = {
        id: adminId,
        username: 'admin',
        permissions: ['VIEW_EVENTS'] // No MODIFY_EVENT permission
      };

      const event = {
        id: eventId,
        name: 'Original Event',
        createdBy: 'other-admin', // Not created by current admin
        state: 'REGISTRATION'
      };

      adminRepository.findById.mockResolvedValue(admin);
      eventService.findById.mockResolvedValue(event);
      permissionService.hasPermission.mockReturnValue(false);

      // Act
      const result = await adminService.updateEvent(eventId, updateData, adminId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to modify this event');
      expect(eventService.updateEvent).not.toHaveBeenCalled();
    });

    it('should allow admin to modify their own events', async () => {
      // Arrange
      const adminId = 'admin-123';
      const eventId = 'event-456';
      const updateData = { name: 'Updated Event Name' };

      const admin = {
        id: adminId,
        username: 'admin',
        permissions: ['CREATE_EVENT', 'MODIFY_EVENT']
      };

      const event = {
        id: eventId,
        name: 'Original Event',
        createdBy: adminId, // Created by current admin
        state: 'REGISTRATION'
      };

      const updatedEvent = {
        ...event,
        name: 'Updated Event Name',
        updatedAt: new Date()
      };

      adminRepository.findById.mockResolvedValue(admin);
      eventService.findById.mockResolvedValue(event);
      permissionService.hasPermission.mockReturnValue(true);
      eventService.updateEvent.mockResolvedValue(updatedEvent);

      // Act
      const result = await adminService.updateEvent(eventId, updateData, adminId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.event).toEqual(updatedEvent);
      expect(eventService.updateEvent).toHaveBeenCalledWith(eventId, updateData);
    });
  });

  describe('Create Admin Form Component', () => {
    it('should render create admin form with all required fields', () => {
      // Arrange
      const onSubmit = jest.fn();
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      // Assert
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create admin/i })).toBeInTheDocument();
    });

    it('should validate form inputs before submission', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      const submitButton = screen.getByRole('button', { name: /create admin/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should validate password confirmation match', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create admin/i });

      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'DifferentPass456!');
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should submit valid admin creation data', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn(() => Promise.resolve({ success: true }));
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      await user.type(screen.getByLabelText(/username/i), 'newadmin');
      await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      await user.selectOptions(screen.getByLabelText(/role/i), 'ADMIN');

      const submitButton = screen.getByRole('button', { name: /create admin/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          username: 'newadmin',
          email: 'admin@example.com',
          password: 'SecurePass123!',
          role: 'ADMIN'
        });
      });
    });

    it('should display success message after admin creation', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn(() => Promise.resolve({
        success: true,
        admin: { username: 'newadmin', email: 'admin@example.com' }
      }));
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      await user.type(screen.getByLabelText(/username/i), 'newadmin');
      await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      await user.selectOptions(screen.getByLabelText(/role/i), 'ADMIN');

      const submitButton = screen.getByRole('button', { name: /create admin/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/admin account created successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/newadmin/)).toBeInTheDocument();
      });
    });

    it('should display error messages for creation failures', async () => {
      // Arrange
      const user = userEvent.setup();
      const onSubmit = jest.fn(() => Promise.resolve({
        success: false,
        error: 'Username already exists'
      }));
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['MANAGE_USERS']
      };

      // Act
      render(<CreateAdminForm onSubmit={onSubmit} currentAdmin={currentAdmin} />);

      await user.type(screen.getByLabelText(/username/i), 'existing-admin');
      await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!');
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!');
      await user.selectOptions(screen.getByLabelText(/role/i), 'ADMIN');

      const submitButton = screen.getByRole('button', { name: /create admin/i });
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
      });
    });

    it('should disable form when user lacks permissions', () => {
      // Arrange
      const currentAdmin = {
        id: 'admin-123',
        permissions: ['VIEW_EVENTS'] // No MANAGE_USERS permission
      };

      // Act
      render(<CreateAdminForm currentAdmin={currentAdmin} />);

      // Assert
      expect(screen.getByLabelText(/username/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /create admin/i })).toBeDisabled();
      expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        password: 'SecurePass123!',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      adminRepository.findByUsername.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(adminService.createAdmin(adminData, 'creator-123'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle password hashing failures', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        password: 'SecurePass123!',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      adminRepository.findByUsername.mockResolvedValue(null);
      adminRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockRejectedValue(new Error('Password hashing failed'));
      permissionService.hasPermission.mockReturnValue(true);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to process admin account');
    });

    it('should handle permission service failures', async () => {
      // Arrange
      const adminId = 'admin-123';

      adminRepository.findById.mockRejectedValue(new Error('Admin not found'));

      // Act
      const result = await adminService.hasPermission(adminId, 'CREATE_EVENT');

      // Assert
      expect(result).toBe(false); // Default to no permission on error
    });

    it('should rollback admin creation on post-creation failures', async () => {
      // Arrange
      const adminData = {
        username: 'newadmin',
        password: 'SecurePass123!',
        email: 'admin@example.com',
        role: 'ADMIN'
      };

      const createdAdmin = {
        id: 'admin-123',
        username: 'newadmin',
        createdAt: new Date()
      };

      adminRepository.findByUsername.mockResolvedValue(null);
      adminRepository.findByEmail.mockResolvedValue(null);
      passwordService.hash.mockResolvedValue('hashed-password');
      permissionService.getDefaultPermissions.mockReturnValue(['CREATE_EVENT']);
      permissionService.hasPermission.mockReturnValue(true);
      adminRepository.create.mockResolvedValue(createdAdmin);

      // Simulate post-creation failure (e.g., email notification)
      const emailService = { sendWelcomeEmail: jest.fn() };
      emailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service unavailable'));

      adminRepository.delete.mockResolvedValue(true);

      // Act
      const result = await adminService.createAdmin(adminData, 'creator-123', {
        sendWelcomeEmail: true,
        rollbackOnFailure: true
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/rollback|rolled back/i);
      expect(adminRepository.delete).toHaveBeenCalledWith('admin-123');
    });
  });
});