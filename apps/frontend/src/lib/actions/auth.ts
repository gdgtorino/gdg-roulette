'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { comparePassword, generateToken, hashPassword } from '@/lib/auth';
import { databaseService } from '@/lib/database';
import type { Admin } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const CreateAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export async function loginAction(formData: FormData) {
  try {
    const rawFormData = {
      username: formData.get('username') as string,
      password: formData.get('password') as string
    };

    const { username, password } = LoginSchema.parse(rawFormData);

    const admin = await databaseService.getAdmin(username);
    if (!admin) {
      return { error: 'Invalid credentials' };
    }

    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return { error: 'Invalid credentials' };
    }

    const token = generateToken({
      adminId: admin.id,
      username: admin.username
    });

    return {
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }

    console.error('Login error:', error);
    return { error: 'Internal server error' };
  }
}

export async function createAdminAction(formData: FormData) {
  try {
    const rawFormData = {
      username: formData.get('username') as string,
      password: formData.get('password') as string
    };

    const { username, password } = CreateAdminSchema.parse(rawFormData);

    // Check if admin already exists
    const existingAdmin = await databaseService.getAdmin(username);
    if (existingAdmin) {
      return { error: 'Admin already exists' };
    }

    // Hash password and create admin
    const hashedPassword = await hashPassword(password);
    const admin: Admin = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      createdAt: new Date()
    };

    await databaseService.createAdmin(admin);

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        createdAt: admin.createdAt
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }

    console.error('Create admin error:', error);
    return { error: 'Internal server error' };
  }
}

export async function deleteAdminAction(username: string, currentAdminUsername: string) {
  try {
    // Prevent self-deletion
    if (username === currentAdminUsername) {
      return { error: 'Cannot delete yourself' };
    }

    const admin = await databaseService.getAdmin(username);
    if (!admin) {
      return { error: 'Admin not found' };
    }

    await databaseService.deleteAdmin(username);
    return { success: true };
  } catch (error) {
    console.error('Delete admin error:', error);
    return { error: 'Internal server error' };
  }
}