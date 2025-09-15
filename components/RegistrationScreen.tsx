import React from 'react';
import { RegistrationForm } from './RegistrationForm';

interface Event {
  id: string;
  name: string;
  state: string;
  registrationOpen: boolean;
  closed: boolean;
}

interface RegistrationScreenProps {
  event: Event;
  enableQRScanner?: boolean;
  accessibilityMode?: boolean;
  children?: React.ReactNode;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({
  event,
  enableQRScanner = false,
  accessibilityMode = false,
  children
}) => {
  return (
    <main aria-label={accessibilityMode ? 'Registration Form' : undefined}>
      {accessibilityMode && (
        <h1 role="heading">Register for {event.name}</h1>
      )}

      {!accessibilityMode && (
        <h1>Register for {event.name}</h1>
      )}

      {children}

      <RegistrationForm event={event} />

      {enableQRScanner && (
        <div>
          <p>Scan QR code</p>
        </div>
      )}
    </main>
  );
};