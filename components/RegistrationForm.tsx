import React, { useState } from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
  registrationOpen: boolean;
}

interface RegistrationFormProps {
  event: Event;
  onSubmit?: (data: { eventId: string; name: string }) => Promise<any> | void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ event, onSubmit }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setMessage('Name is required');
      setIsError(true);
      return;
    }

    if (!event.registrationOpen) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      if (onSubmit) {
        const result = await onSubmit({ eventId: event.id, name: name.trim() });

        if (result && !result.success) {
          setMessage(result.error || 'Registration failed');
          setIsError(true);
        } else if (result && result.success) {
          const participantName = result.participant?.name || name.trim();
          setMessage(`Successfully registered! Welcome, ${participantName}!`);
          setIsError(false);
        }
      }
    } catch (error) {
      setMessage('Registration failed');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = !event.registrationOpen || isLoading;

  return (
    <div>
      <h2>{event.name}</h2>

      {!event.registrationOpen && (
        <p>Registration is closed</p>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isDisabled}
          aria-required="true"
          aria-describedby={message ? 'message' : undefined}
        />

        <button
          type="submit"
          disabled={isDisabled}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>

      {message && (
        <div id="message" style={{ color: isError ? 'red' : 'green' }}>
          {message}
        </div>
      )}
    </div>
  );
};