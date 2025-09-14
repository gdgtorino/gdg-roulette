'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { login } from '@/lib/actions/auth';

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t('admin.signingIn') : t('admin.signIn')}
    </Button>
  );
}

export function LoginForm() {
  const { t } = useTranslation();
  const [state, formAction] = useFormState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input
          type="text"
          name="username"
          placeholder={t('admin.username')}
          required
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <div>
        <Input
          type="password"
          name="password"
          placeholder={t('admin.password')}
          required
          className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <SubmitButton />
      {state && !state.success && (
        <div className="text-red-500 text-sm text-center mt-2">
          {state.error}
        </div>
      )}
    </form>
  );
}