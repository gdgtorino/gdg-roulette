'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { login } from '@/lib/actions/auth';

// Wrapper action for useFormState
async function loginWithState(
  prevState: { success: boolean; error: string } | null,
  formData: FormData,
) {
  return login(prevState, formData);
}

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending} data-testid="login-button">
      {pending ? t('admin.signingIn') : t('admin.signIn')}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useTranslation();
  const [state, formAction] = useFormState(loginWithState, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input
          type="text"
          name="username"
          placeholder={t('admin.username')}
          required
          data-testid="username-input"
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <div>
        <Input
          type="password"
          name="password"
          placeholder={t('admin.password')}
          required
          data-testid="password-input"
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <SubmitButton />
      {state && !state.success && (
        <div className="text-red-500 text-sm text-center mt-2">{state.error}</div>
      )}
    </form>
  );
}
