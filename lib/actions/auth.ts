'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { appRouter } from '../trpc/root';
import type { Context } from '../trpc/context';
import { redisService } from '../redis';
import { TRPCError } from '@trpc/server';

export async function login(
  prevState: { success: boolean; error: string } | null,
  formData: FormData
): Promise<{ success: boolean; error: string }> {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    await redisService.connect();

    // Create context for tRPC call
    const mockReq = {
      headers: {
        get: () => null,
      },
    } as { headers: { get: () => null } };

    const ctx = { req: mockReq } as unknown as Context;
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({ username, password });

    // Set secure cookie
    const cookieStore = cookies();
    cookieStore.set('auth_token', result.token, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    redirect('/admin/dashboard');
  } catch (error) {
    if (error instanceof TRPCError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Login failed' };
  }
}

export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete('auth_token');
  redirect('/admin');
}

// For forms that use useFormState
export async function logoutWithState(): Promise<{ success: boolean; error: string }> {
  try {
    const cookieStore = cookies();
    cookieStore.delete('auth_token');
    redirect('/admin');
  } catch {
    return { success: false, error: 'Logout failed' };
  }
}