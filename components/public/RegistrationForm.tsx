'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';

interface RegistrationFormProps {
  eventId?: string;
}

export function RegistrationForm({ eventId }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          eventId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      toast({
        title: 'Registration Successful!',
        description: 'You have been registered for the draw.',
      });

      router.push(`/events/${eventId}/waiting?participantId=${result.participant.id}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          required
          placeholder="Enter your email address"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number (Optional)
        </label>
        <Input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="Enter your phone number"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
        {isSubmitting ? 'Registering...' : 'Register for Draw'}
      </Button>
    </form>
  );
}
