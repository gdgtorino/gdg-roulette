'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';
import { createEvent } from '@/lib/actions/events';
import { Plus } from 'lucide-react';

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? t('loading') : t('save')}
    </Button>
  );
}

interface CreateEventFormProps {
  onSuccess?: () => void;
}

async function createEventAction(
  prevState: { success: boolean; error: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error: string }> {
  return await createEvent(prevState, formData);
}

function CreateEventForm({}: CreateEventFormProps) {
  const [state, formAction] = useFormState(createEventAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Input
          type="text"
          name="name"
          placeholder="Event name"
          required
          minLength={3}
          maxLength={100}
          className="w-full"
        />
      </div>
      <div className="flex gap-2">
        <SubmitButton />
      </div>
      {state && !state.success && <div className="text-red-500 text-sm">{state.error}</div>}
    </form>
  );
}

export function CreateEventButton() {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <CreateEventForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
