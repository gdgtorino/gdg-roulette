'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Event, Participant } from '@/lib/types';

interface RegistrationFormProps {
  event: Event;
  onRegister?: (participant: Participant) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface ValidationErrors {
  name?: string;
}

export function RegistrationForm({
  event,
  onRegister,
  onError,
  disabled = false,
  className = '',
}: RegistrationFormProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState('');

  const validateName = (value: string): string | undefined => {
    const trimmedName = value.trim();

    if (!trimmedName) {
      return 'Name is required';
    }

    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters long';
    }

    if (trimmedName.length > 100) {
      return 'Name must be less than 100 characters';
    }

    // Check for invalid characters
    if (
      !/^[a-zA-Z\s\-'àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð,.''""]+$/.test(
        trimmedName,
      )
    ) {
      return 'Name contains invalid characters';
    }

    // Check for newlines or tabs
    if (trimmedName.includes('\n') || trimmedName.includes('\t')) {
      return 'Name format is invalid';
    }

    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSubmitError('');

    // Clear name error when user starts typing
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setErrors({});

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    // Check if event allows registration
    if (!event.registrationOpen) {
      setSubmitError('Registration is not open for this event');
      return;
    }

    if (event.closed) {
      setSubmitError('This event has been closed');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          name: name.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Success - clear form
      setName('');
      setErrors({});
      setSubmitError('');

      if (onRegister) {
        onRegister(result.participant);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setSubmitError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = !validateName(name) && !isSubmitting && !disabled;

  return (
    <Card className={`w-full max-w-md p-6 ${className}`}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Register</h2>
        <h3 className="text-lg text-gray-600">{event.name}</h3>
        {event.description && <p className="text-sm text-gray-500 mt-2">{event.description}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="participant-name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Full Name
          </label>
          <Input
            id="participant-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter your full name"
            disabled={isSubmitting || disabled}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-red-800 text-sm">{submitError}</p>
          </div>
        )}

        <Button type="submit" disabled={!isFormValid} className="w-full" size="lg">
          {isSubmitting ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Registering...
            </>
          ) : (
            'Register for Draw'
          )}
        </Button>
      </form>

      {/* Event Status Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Event Status:</span>
          <span
            className={
              event.registrationOpen
                ? 'text-green-600'
                : event.closed
                  ? 'text-red-600'
                  : 'text-yellow-600'
            }
          >
            {event.registrationOpen ? 'Open' : event.closed ? 'Closed' : 'Pending'}
          </span>
        </div>
        {event.registrationOpen && !event.closed && (
          <p className="text-xs text-gray-500 mt-2">
            Registration is currently open. You will be notified when the draw begins.
          </p>
        )}
        {!event.registrationOpen && !event.closed && (
          <p className="text-xs text-yellow-600 mt-2">
            Registration has not started yet for this event.
          </p>
        )}
        {event.closed && (
          <p className="text-xs text-red-600 mt-2">
            This event has been closed and no longer accepts registrations.
          </p>
        )}
      </div>

      {/* Event Details */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">Event ID: {event.id}</p>
        <p className="text-xs text-gray-400">Created: {event.createdAt.toLocaleDateString()}</p>
      </div>
    </Card>
  );
}
