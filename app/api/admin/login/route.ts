import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword, signToken } from '@/lib/auth/jwt';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    // find admin
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'invalid credentials' },
        { status: 401 }
      );
    }

    // verify password
    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'invalid credentials' },
        { status: 401 }
      );
    }

    // generate token
    const token = signToken({
      adminId: admin.id,
      username: admin.username,
    });

    // create response with cookie
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}