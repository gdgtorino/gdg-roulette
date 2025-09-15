'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import { createEvent } from '@/lib/actions/events';

type FormState = {
  success: boolean;
  error: string;
} | null;

async function createEventAction(prevState: FormState, formData: FormData): Promise<FormState> {
  return await createEvent(prevState, formData);
}

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? t('common.loading') : t('admin.createButton')}
    </Button>
  );
}

export function CreateEventForm() {
  const { t } = useTranslation();
  const [state, formAction] = useFormState(createEventAction, null);

  return (
    <form action={formAction} className="flex gap-4">
      <Input
        type="text"
        name="name"
        placeholder={t('admin.eventName')}
        required
        className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        minLength={3}
        maxLength={100}
      />
      <SubmitButton />
      {state && !state.success && <div className="text-red-500 text-sm mt-2">{state.error}</div>}
    </form>
  );
}
