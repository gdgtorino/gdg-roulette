'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { toggleEventRegistration } from '@/lib/actions/qr';

interface Event {
  id: string;
  registrationOpen: boolean;
}

interface RegistrationToggleProps {
  event: Event;
}

function ToggleButton({ event }: { event: Event }) {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={event.registrationOpen ? "destructive" : "default"}
      size="lg"
    >
      {pending
        ? 'Processing...'
        : event.registrationOpen
          ? 'Close Registration & Start Draw'
          : 'Reopen Registration'
      }
    </Button>
  );
}

export function RegistrationToggle({ event }: RegistrationToggleProps) {
  const [state, formAction] = useFormState(
    (prevState: any, formData: FormData) => toggleEventRegistration(event.id),
    null
  );

  return (
    <form action={formAction}>
      <ToggleButton event={event} />
      {state && !state.success && (
        <div className="text-red-500 text-sm mt-2">
          {state.error}
        </div>
      )}
    </form>
  );
}