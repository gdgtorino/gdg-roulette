'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  registrationOpen: boolean;
}

export default function RegisterPage(): JSX.Element {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered] = useState(false);
  const [error, setError] = useState('');
  const [nameValidation, setNameValidation] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: '',
  });

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchEvent = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/events/${eventId}`);

      if (response.ok) {
        const eventData = (await response.json()) as Event;
        setEvent(eventData);
      } else {
        setError(t('registration.notFound'));
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      setError(t('common.error'));
    }
  }, [eventId, t]);

  const generateDefaultName = async (): Promise<string> => {
    // Generate a random passphrase-style name (client-side)
    const adjectives = [
      'brave',
      'bright',
      'calm',
      'clever',
      'cool',
      'eager',
      'fair',
      'gentle',
      'happy',
      'kind',
      'lively',
      'nice',
      'proud',
      'quick',
      'quiet',
      'smart',
      'swift',
      'warm',
      'wise',
      'young',
    ];

    const nouns = [
      'tiger',
      'eagle',
      'wolf',
      'bear',
      'lion',
      'fox',
      'deer',
      'hawk',
      'owl',
      'cat',
      'dog',
      'fish',
      'bird',
      'star',
      'moon',
      'sun',
      'tree',
      'rock',
      'wind',
      'fire',
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;

    return `${adjective}-${noun}-${number}`;
  };

  const checkExistingParticipant = async (participantName: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/events/${eventId}/find-participant/${encodeURIComponent(participantName)}`,
      );
      if (response.ok) {
        const data = (await response.json()) as { found: boolean; participantId?: string };
        if (data.found && data.participantId) {
          // Redirect to existing participant's waiting page
          window.location.href = `/waiting/${eventId}/${data.participantId}`;
          return true; // Found existing participant
        }
      }
    } catch (error) {
      console.error('Failed to check existing participant:', error);
    }
    return false; // No existing participant found
  };

  const checkNameAvailability = useCallback(
    async (participantName: string): Promise<void> => {
      if (!participantName.trim()) {
        setNameValidation({
          isChecking: false,
          isAvailable: null,
          message: '',
        });
        return;
      }

      setNameValidation((prev) => ({ ...prev, isChecking: true }));

      try {
        const response = await fetch(
          `/api/events/${eventId}/check-name/${encodeURIComponent(participantName)}`,
        );
        if (response.ok) {
          const data = (await response.json()) as { available: boolean; reason?: string };
          setNameValidation({
            isChecking: false,
            isAvailable: data.available,
            message: data.available ? 'Name is available!' : data.reason || 'Name not available',
          });
        }
      } catch (error) {
        console.error('Failed to check name availability:', error);
        setNameValidation({
          isChecking: false,
          isAvailable: null,
          message: 'Error checking name availability',
        });
      }
    },
    [eventId],
  );

  const debouncedCheckName = useCallback(
    (participantName: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        void checkNameAvailability(participantName);
      }, 500);
    },
    [checkNameAvailability],
  );

  const register = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const registrationName = name.trim() || (await generateDefaultName());

      // First check if participant already exists (for redirect system)
      if (name.trim()) {
        const existingFound = await checkExistingParticipant(registrationName);
        if (existingFound) {
          return; // Stop registration if existing participant was found and redirected
        }
      }

      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: registrationName }),
      });

      if (response.ok) {
        const participant = await response.json();
        // Redirect to private waiting page
        window.location.href = `/waiting/${eventId}/${participant.id}`;
      } else {
        const errorData = (await response.json()) as { error: string };
        setError(errorData.error || t('registration.error'));
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    void fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (name.trim()) {
      debouncedCheckName(name.trim());
    } else {
      setNameValidation({
        isChecking: false,
        isAvailable: null,
        message: '',
      });
    }

    // Cleanup timer on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [name, debouncedCheckName]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-900 dark:text-white">{t('common.loading')}</div>
      </div>
    );
  }

  if (!event && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <div className="text-gray-900 dark:text-white">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600 dark:text-red-400">
              {t('registration.error')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Link href="/">
              <Button className="w-full">{t('registration.backToHome')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">{t('common.loading')}</div>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600 dark:text-green-400">
              🎉 {t('registration.alreadyRegistered')}
            </CardTitle>
            <CardDescription className="dark:text-gray-300">
              {t('lottery.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Event: {event.name}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {t('registration.yourName')}: <span className="font-medium">{name}</span>
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Keep this page open or screenshot it. The draw will
                happen when the organizer is ready.
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('waiting.goodLuck')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event.registrationOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900 dark:to-rose-900 flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 flex gap-2">
          <LanguageSwitcher />
          <DarkModeToggle />
        </div>
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600 dark:text-red-400">
              {t('registration.closed')}
            </CardTitle>
            <CardDescription className="dark:text-gray-300">{event.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
              {t('registration.closedMessage')}
            </p>
            <Link href="/">
              <Button className="w-full">{t('registration.backToHome')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('registration.title')}
          </CardTitle>
          <CardDescription className="text-lg dark:text-gray-300">{event.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={register} className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t('registration.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  className={`text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 ${
                    nameValidation.isAvailable === false
                      ? 'border-red-500 focus:border-red-500'
                      : nameValidation.isAvailable === true
                        ? 'border-green-500 focus:border-green-500'
                        : ''
                  }`}
                />
                {nameValidation.isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                )}
                {!nameValidation.isChecking && nameValidation.isAvailable === true && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 dark:text-green-400">
                    ✓
                  </div>
                )}
                {!nameValidation.isChecking && nameValidation.isAvailable === false && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-600 dark:text-red-400">
                    ✗
                  </div>
                )}
              </div>

              {nameValidation.message && (
                <p
                  className={`text-xs mt-1 text-center ${
                    nameValidation.isAvailable === true
                      ? 'text-green-600 dark:text-green-400'
                      : nameValidation.isAvailable === false
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {nameValidation.message}
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                {t('registration.optional')}
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={
                loading ||
                (name.trim() && nameValidation.isAvailable === false) ||
                nameValidation.isChecking
              }
            >
              {loading
                ? t('registration.registering')
                : nameValidation.isChecking
                  ? 'Checking name...'
                  : name.trim() && nameValidation.isAvailable === false
                    ? 'Name not available'
                    : t('registration.register') + ' 🎯'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By joining, you confirm you&apos;re eligible to participate
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
