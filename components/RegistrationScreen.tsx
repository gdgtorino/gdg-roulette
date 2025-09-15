'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Event } from '@/lib/types';

interface RegistrationScreenProps {
  event: Event;
  message?: string;
  enableQRScanner?: boolean;
  accessibilityMode?: boolean;
  onRegister?: (name: string) => Promise<void>;
}

export function RegistrationScreen({
  event,
  message,
  enableQRScanner = false,
  accessibilityMode = false,
  onRegister
}: RegistrationScreenProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long');
      return;
    }

    if (name.trim().length > 100) {
      setError('Name must be less than 100 characters');
      return;
    }

    if (isOffline) {
      setError('Cannot register while offline');
      return;
    }

    setIsSubmitting(true);

    try {
      if (onRegister) {
        await onRegister(name.trim());
      } else {
        // Default registration logic
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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Registration failed');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-orange-600 mb-4">Offline Mode</h1>
            <p className="text-gray-600 mb-4">
              Cannot register while offline. Please check your internet connection.
            </p>
            <p className="text-sm text-gray-500">
              Connection restored functionality will be available when back online.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md p-6">
        <main
          role="main"
          aria-label={accessibilityMode ? "Registration Form" : undefined}
        >
          <div className="text-center mb-6">
            <h1
              className="text-2xl font-bold text-gray-800 mb-2"
              role={accessibilityMode ? "heading" : undefined}
            >
              Register for {event.name}
            </h1>
            {message && (
              <p className="text-sm text-blue-600 mb-4" role="status">
                {message}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
                disabled={isSubmitting || isOffline}
                aria-required={accessibilityMode ? "true" : undefined}
                aria-describedby={accessibilityMode ? "name-help" : undefined}
                className="w-full"
              />
              {accessibilityMode && (
                <p id="name-help" className="text-xs text-gray-500 mt-1">
                  Enter your full name to register for this event
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm" role="alert">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || isOffline}
              className="w-full"
              size="lg"
              aria-describedby={accessibilityMode ? "register-help" : undefined}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </Button>

            {accessibilityMode && (
              <p id="register-help" className="text-xs text-gray-500 text-center">
                Click to register for the event
              </p>
            )}
          </form>

          {enableQRScanner && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Or</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // QR scanner logic would go here
                    console.log('QR scanner would open');
                  }}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  Scan QR Code to Register
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Event ID: {event.id}
            </p>
          </div>
        </main>
      </Card>
    </div>
  );
}