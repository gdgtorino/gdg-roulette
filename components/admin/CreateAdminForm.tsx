'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';
import { Admin } from '@/lib/types';

interface CreateAdminFormProps {
  onAdminCreated?: (admin: Admin) => void;
  onSubmit?: (data: {
    username: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<{ success: boolean; admin?: Admin; error?: string }>;
  onCancel?: () => void;
  creatorAdmin?: Admin;
  currentAdmin?: Admin;
  className?: string;
}

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
}

interface ValidationErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  role?: string;
}

const ROLE_OPTIONS = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Full access to all features',
    permissions: ['*'],
    badge: 'danger',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Create events, manage users, view analytics',
    permissions: ['CREATE_EVENT', 'MANAGE_USERS', 'VIEW_ANALYTICS'],
    badge: 'primary',
  },
  {
    value: 'MODERATOR',
    label: 'Moderator',
    description: 'View events and analytics only',
    permissions: ['VIEW_EVENTS', 'VIEW_ANALYTICS'],
    badge: 'secondary',
  },
] as const;

export function CreateAdminForm({
  onAdminCreated,
  onSubmit,
  onCancel,
  creatorAdmin,
  currentAdmin,
  className = '',
}: CreateAdminFormProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    role: 'ADMIN',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Use currentAdmin or creatorAdmin for permissions
  const admin = currentAdmin || creatorAdmin;

  // Check if user has permission to create admin accounts
  const hasPermission = admin?.permissions?.includes('MANAGE_USERS') || admin?.permissions?.includes('*') || false;

  // Check if current user has permissions to create admins
  const adminToCheck = currentAdmin || creatorAdmin;
  const hasManageUsersPermission = adminToCheck?.permissions?.includes('MANAGE_USERS') ?? false;
  const isFormDisabled = !hasManageUsersPermission;

  const validateUsername = (username: string): string | undefined => {
    const trimmed = username.trim();

    if (!trimmed) return 'Username is required';
    if (trimmed.length < 3) return 'Username must be at least 3 characters';
    if (trimmed.length > 50) return 'Username must be less than 50 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
      return 'Username can only contain letters, numbers, underscores, and hyphens';

    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    if (!/(?=.*[!@#$%^&*])/.test(password))
      return 'Password must contain at least one special character';

    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim();

    if (!trimmed) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address';

    return undefined;
  };

  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSubmitError('');

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear confirm password error when password is changed
    if (field === 'password' && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSuccessMessage('');
    setErrors({});

    try {
      let result;

      if (onSubmit) {
        // Use custom onSubmit handler (for tests)
        result = await onSubmit({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });
      } else {
        // Use default API call
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username.trim(),
            password: formData.password,
            email: formData.email.trim(),
            role: formData.role,
          }),
        });

        result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create admin account');
        }
      }

      if (!result.success) {
        setSubmitError(result.error || 'Failed to create admin account');
        return;
      }

      // Success - reset form and show success message
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        role: 'ADMIN',
      });

      if (result.admin) {
        setSuccessMessage(`Admin account created successfully for ${result.admin.username}`);
      }

      if (onAdminCreated && result.admin) {
        onAdminCreated(result.admin);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create admin account';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find((role) => role.value === formData.role);

  return (
    <Card className={`w-full max-w-2xl p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
        <p className="text-gray-600">
          Create a new administrator account with specific permissions and access levels.
        </p>
        {(creatorAdmin || currentAdmin) && (
          <p className="text-sm text-gray-500 mt-2">Creating as: {(currentAdmin || creatorAdmin)?.username}</p>
        )}
        {isFormDisabled && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-red-800 text-sm">Insufficient permissions to create admin accounts</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Username *
          </label>
          <Input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            placeholder="Enter username"
            disabled={isSubmitting || isFormDisabled}
            aria-invalid={errors.username ? 'true' : 'false'}
            className={errors.username ? 'border-red-300' : ''}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.username}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter email address"
            disabled={isSubmitting || isFormDisabled}
            aria-invalid={errors.email ? 'true' : 'false'}
            className={errors.email ? 'border-red-300' : ''}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Password *
          </label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter secure password"
            disabled={isSubmitting || isFormDisabled}
            aria-invalid={errors.password ? 'true' : 'false'}
            className={errors.password ? 'border-red-300' : ''}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.password}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password *
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Re-enter password"
            disabled={isSubmitting || isFormDisabled}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-label="Confirm Password"
            className={errors.confirmPassword ? 'border-red-300' : ''}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-3">Role *</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            disabled={isSubmitting || isFormDisabled}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {/* Role Details */}
          <div className="mt-3 space-y-3">
            {ROLE_OPTIONS.map((role) => (
              <div
                key={role.value}
                className={`p-3 border rounded-lg ${formData.role === role.value ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                style={{ display: formData.role === role.value ? 'block' : 'none' }}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900">{role.label}</span>
                  <Badge variant={role.badge as 'primary' | 'secondary' | 'danger'} className="text-xs">
                    {role.value.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{role.description}</p>
                <div className="mt-1">
                  <p className="text-xs text-gray-500">
                    Permissions: {role.permissions.join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {errors.role}
            </p>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md" role="alert">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={isSubmitting || isFormDisabled} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Creating Account...
              </>
            ) : (
              'Create Admin'
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isFormDisabled}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Selected Role Summary */}
      {selectedRole && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Selected Role: {selectedRole.label}</h4>
          <p className="text-sm text-blue-800 mb-2">{selectedRole.description}</p>
          <div className="text-xs text-blue-700">
            <strong>Permissions:</strong> {selectedRole.permissions.join(', ')}
          </div>
        </div>
      )}
    </Card>
  );
}
