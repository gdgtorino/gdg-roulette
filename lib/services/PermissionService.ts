export type Permission =
  | 'CREATE_EVENT'
  | 'MODIFY_EVENT'
  | 'DELETE_EVENT'
  | 'VIEW_EVENTS'
  | 'MANAGE_USERS'
  | 'VIEW_ANALYTICS'
  | 'DELETE_ALL_EVENTS'
  | 'READ_ONLY_MODE'
  | '*'; // Wildcard for all permissions

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export interface PermissionValidationResult {
  valid: boolean;
  errors: string[];
}

export class PermissionService {
  private readonly rolePermissions: Record<Role, Permission[]> = {
    SUPER_ADMIN: ['*'], // All permissions
    ADMIN: [
      'CREATE_EVENT',
      'MODIFY_EVENT',
      'DELETE_EVENT',
      'VIEW_EVENTS',
      'MANAGE_USERS',
      'VIEW_ANALYTICS',
    ],
    MODERATOR: ['VIEW_EVENTS', 'VIEW_ANALYTICS'],
  };

  private readonly permissionHierarchy: Record<Permission, Permission[]> = {
    '*': [
      'CREATE_EVENT',
      'MODIFY_EVENT',
      'DELETE_EVENT',
      'VIEW_EVENTS',
      'MANAGE_USERS',
      'VIEW_ANALYTICS',
      'DELETE_ALL_EVENTS',
      'READ_ONLY_MODE',
    ],
    MANAGE_USERS: ['VIEW_EVENTS', 'VIEW_ANALYTICS'],
    DELETE_EVENT: ['MODIFY_EVENT', 'VIEW_EVENTS'],
    MODIFY_EVENT: ['VIEW_EVENTS'],
    CREATE_EVENT: ['VIEW_EVENTS'],
    DELETE_ALL_EVENTS: ['DELETE_EVENT', 'MODIFY_EVENT', 'VIEW_EVENTS'],
    VIEW_ANALYTICS: [],
    VIEW_EVENTS: [],
    READ_ONLY_MODE: [],
  };

  private readonly conflictingPermissions: Record<Permission, Permission[]> = {
    DELETE_ALL_EVENTS: ['READ_ONLY_MODE'],
    READ_ONLY_MODE: [
      'CREATE_EVENT',
      'MODIFY_EVENT',
      'DELETE_EVENT',
      'DELETE_ALL_EVENTS',
      'MANAGE_USERS',
    ],
  };

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check direct permission
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check inherited permissions through hierarchy
    return this.hasInheritedPermission(userPermissions, requiredPermission);
  }

  /**
   * Check if user can grant a specific permission
   */
  canGrantPermission(granterPermissions: Permission[], permissionToGrant: Permission): boolean {
    // Super admin can grant any permission
    if (granterPermissions.includes('*')) {
      return true;
    }

    // Can only grant permissions you have
    if (!this.hasPermission(granterPermissions, permissionToGrant)) {
      return false;
    }

    // Special cases for sensitive permissions
    if (permissionToGrant === '*') {
      return granterPermissions.includes('*');
    }

    if (permissionToGrant === 'MANAGE_USERS') {
      return granterPermissions.includes('*') || granterPermissions.includes('MANAGE_USERS');
    }

    return true;
  }

  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role: Role): Permission[] {
    return [...this.rolePermissions[role]];
  }

  /**
   * Validate permission combination
   */
  validatePermissions(permissions: Permission[]): PermissionValidationResult {
    const errors: string[] = [];

    // Check for conflicting permissions
    for (const permission of permissions) {
      const conflicts = this.conflictingPermissions[permission] || [];
      for (const conflict of conflicts) {
        if (permissions.includes(conflict)) {
          errors.push(`Cannot combine ${permission} with ${conflict}`);
        }
      }
    }

    // Check for invalid permissions
    const validPermissions = this.getAllValidPermissions();
    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        errors.push(`Invalid permission: ${permission}`);
      }
    }

    // Check for redundant permissions (where one implies another)
    const redundantPermissions = this.findRedundantPermissions(permissions);
    if (redundantPermissions.length > 0) {
      errors.push(`Redundant permissions detected: ${redundantPermissions.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Expand permissions to include inherited ones
   */
  expandPermissions(permissions: Permission[]): Permission[] {
    const expandedPermissions = new Set<Permission>();

    for (const permission of permissions) {
      expandedPermissions.add(permission);

      // Add inherited permissions
      const inherited = this.permissionHierarchy[permission] || [];
      for (const inheritedPermission of inherited) {
        expandedPermissions.add(inheritedPermission);
      }
    }

    return Array.from(expandedPermissions);
  }

  /**
   * Get minimum permissions needed for a set of operations
   */
  getMinimumPermissions(requiredOperations: Permission[]): Permission[] {
    const minimumPermissions: Permission[] = [];

    for (const operation of requiredOperations) {
      // Check if this operation is already covered by existing permissions
      if (!this.hasPermission(minimumPermissions, operation)) {
        minimumPermissions.push(operation);
      }
    }

    return minimumPermissions;
  }

  /**
   * Check if role can perform action
   */
  roleCanPerformAction(role: Role, action: Permission): boolean {
    const rolePermissions = this.getDefaultPermissions(role);
    return this.hasPermission(rolePermissions, action);
  }

  /**
   * Get permissions difference between two permission sets
   */
  getPermissionDifference(
    currentPermissions: Permission[],
    newPermissions: Permission[],
  ): {
    added: Permission[];
    removed: Permission[];
    unchanged: Permission[];
  } {
    const current = new Set(currentPermissions);
    const newPerms = new Set(newPermissions);

    const added = newPermissions.filter((p) => !current.has(p));
    const removed = currentPermissions.filter((p) => !newPerms.has(p));
    const unchanged = currentPermissions.filter((p) => newPerms.has(p));

    return { added, removed, unchanged };
  }

  /**
   * Create permission mask for UI display
   */
  createPermissionMask(userPermissions: Permission[]): Record<Permission, boolean> {
    const allPermissions = this.getAllValidPermissions();
    const mask: Record<Permission, boolean> = {} as Record<Permission, boolean>;

    for (const permission of allPermissions) {
      mask[permission] = this.hasPermission(userPermissions, permission);
    }

    return mask;
  }

  /**
   * Get permission description
   */
  getPermissionDescription(permission: Permission): string {
    const descriptions: Record<Permission, string> = {
      '*': 'All permissions (Super Admin)',
      CREATE_EVENT: 'Create new events',
      MODIFY_EVENT: 'Modify existing events',
      DELETE_EVENT: 'Delete specific events',
      VIEW_EVENTS: 'View events and participants',
      MANAGE_USERS: 'Create and manage admin users',
      VIEW_ANALYTICS: 'View system analytics and reports',
      DELETE_ALL_EVENTS: 'Delete all events (dangerous)',
      READ_ONLY_MODE: 'Read-only access (no modifications)',
    };

    return descriptions[permission] || 'Unknown permission';
  }

  /**
   * Get role description
   */
  getRoleDescription(role: Role): string {
    const descriptions: Record<Role, string> = {
      SUPER_ADMIN: 'Full system access with all permissions',
      ADMIN: 'Standard admin with event and user management',
      MODERATOR: 'View-only access to events and analytics',
    };

    return descriptions[role];
  }

  /**
   * Check for security violations in permission assignment
   */
  checkSecurityViolations(
    granterPermissions: Permission[],
    targetPermissions: Permission[],
  ): string[] {
    const violations: string[] = [];

    // Check if trying to grant higher permissions than granter has
    for (const permission of targetPermissions) {
      if (!this.canGrantPermission(granterPermissions, permission)) {
        violations.push(`Cannot grant permission '${permission}' - insufficient privileges`);
      }
    }

    // Check for privilege escalation attempts
    if (targetPermissions.includes('*') && !granterPermissions.includes('*')) {
      violations.push('Cannot grant super admin permissions');
    }

    // Check for dangerous permission combinations
    if (targetPermissions.includes('DELETE_ALL_EVENTS') && targetPermissions.length > 1) {
      violations.push('DELETE_ALL_EVENTS should not be combined with other permissions');
    }

    return violations;
  }

  /**
   * Get all valid permissions
   */
  private getAllValidPermissions(): Permission[] {
    return [
      '*',
      'CREATE_EVENT',
      'MODIFY_EVENT',
      'DELETE_EVENT',
      'VIEW_EVENTS',
      'MANAGE_USERS',
      'VIEW_ANALYTICS',
      'DELETE_ALL_EVENTS',
      'READ_ONLY_MODE',
    ];
  }

  /**
   * Check if user has inherited permission through hierarchy
   */
  private hasInheritedPermission(
    userPermissions: Permission[],
    requiredPermission: Permission,
  ): boolean {
    // Check if any of the user's permissions include the required permission in their hierarchy
    for (const userPermission of userPermissions) {
      const inherited = this.permissionHierarchy[userPermission] || [];
      if (inherited.includes(requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find redundant permissions in a permission set
   */
  private findRedundantPermissions(permissions: Permission[]): Permission[] {
    const redundant: Permission[] = [];

    for (const permission of permissions) {
      // Check if this permission is implied by any other permission
      for (const otherPermission of permissions) {
        if (permission !== otherPermission) {
          const implied = this.permissionHierarchy[otherPermission] || [];
          if (implied.includes(permission)) {
            redundant.push(permission);
            break;
          }
        }
      }
    }

    return redundant;
  }

  /**
   * Audit permission changes
   */
  auditPermissionChange(
    adminId: string,
    targetAdminId: string,
    oldPermissions: Permission[],
    newPermissions: Permission[],
    reason?: string,
  ): {
    timestamp: Date;
    adminId: string;
    targetAdminId: string;
    changes: {
      added: Permission[];
      removed: Permission[];
    };
    reason?: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  } {
    const { added, removed } = this.getPermissionDifference(oldPermissions, newPermissions);

    // Assess risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    if (added.includes('*') || removed.includes('*')) {
      riskLevel = 'HIGH';
    } else if (
      added.includes('MANAGE_USERS') ||
      added.includes('DELETE_ALL_EVENTS') ||
      removed.includes('MANAGE_USERS') ||
      removed.includes('DELETE_ALL_EVENTS')
    ) {
      riskLevel = 'HIGH';
    } else if (added.includes('DELETE_EVENT') || removed.includes('DELETE_EVENT')) {
      riskLevel = 'MEDIUM';
    }

    return {
      timestamp: new Date(),
      adminId,
      targetAdminId,
      changes: { added, removed },
      reason,
      riskLevel,
    };
  }
}
