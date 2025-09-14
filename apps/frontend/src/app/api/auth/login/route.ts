import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redisService } from '@/lib/redis';
import { comparePassword, generateToken } from '@/lib/auth';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = LoginSchema.parse(body);

    const admin = await redisService.getAdmin(username);
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      adminId: admin.id,
      username: admin.username
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}