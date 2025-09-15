'use server';

import { cookies } from 'next/headers';

export async function setTheme(theme: 'light' | 'dark') {
  const cookieStore = cookies();
  cookieStore.set('theme', theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

// For forms that use useFormState
export async function setThemeWithState(
  prevState: { success: boolean; error: string } | null,
  formData: FormData
): Promise<{ success: boolean; error: string }> {
  try {
    const theme = formData.get('theme') as 'light' | 'dark';
    if (theme !== 'light' && theme !== 'dark') {
      return { success: false, error: 'Invalid theme' };
    }

    const cookieStore = cookies();
    cookieStore.set('theme', theme, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return { success: true, error: '' };
  } catch {
    return { success: false, error: 'Failed to set theme' };
  }
}