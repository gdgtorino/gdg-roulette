'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { closeEvent } from '@/lib/actions/draw';

interface CloseEventButtonProps {
  eventId: string;
}

function CloseButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} variant="default">
      {pending ? 'Closing Event...' : 'Close Event & View Results'}
    </Button>
  );
}

export function CloseEventButton({ eventId }: CloseEventButtonProps) {
  const [state, formAction] = useFormState(
    (prevState: any, formData: FormData) => closeEvent(eventId),
    null
  );

  return (
    <form action={formAction}>
      <CloseButton />
      {state && !state.success && (
        <div className="text-red-500 text-sm mt-2">
          {state.error}
        </div>
      )}
    </form>
  );
}