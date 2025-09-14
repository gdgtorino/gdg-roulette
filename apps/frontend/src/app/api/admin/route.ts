import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '@/lib/redis';
import { hashPassword } from '@/lib/auth';
import { requireAuth } from '@/lib/auth-middleware';
import type { Admin } from '@/lib/types';

const CreateAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Get all admins (protected)
export const GET = requireAuth(async (req, admin) => {
  try {
    const admins = await redisService.getAllAdmins();
    // Return admins without passwords
    const safeAdmins = admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt
    }));

    return NextResponse.json(safeAdmins);
  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Create new admin (protected)
export const POST = requireAuth(async (req, admin) => {
  try {
    const body = await req.json();
    const { username, password } = CreateAdminSchema.parse(body);

    // Check if admin already exists
    const existingAdmin = await redisService.getAdmin(username);
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin already exists' },
        { status: 400 }
      );
    }

    // Hash password and create admin
    const hashedPassword = await hashPassword(password);
    const newAdmin: Admin = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      createdAt: new Date()
    };

    await redisService.createAdmin(newAdmin);

    // Return admin without password
    return NextResponse.json(
      {
        id: newAdmin.id,
        username: newAdmin.username,
        createdAt: newAdmin.createdAt
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});