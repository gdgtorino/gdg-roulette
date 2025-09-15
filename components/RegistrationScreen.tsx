import React from 'react';

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
  children,
}) => {
  // Check for offline mode
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <main aria-label={accessibilityMode ? 'Registration Form' : undefined}>
      {accessibilityMode && <h1 role="heading">Register for {event.name}</h1>}

      {!accessibilityMode && <h1>Register for {event.name}</h1>}

      {children}

      {isOffline && (
        <div>
          <p>Offline mode</p>
          <p>Connection restored</p>
        </div>
      )}

      <div>
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          aria-required={accessibilityMode ? 'true' : undefined}
          aria-describedby={accessibilityMode ? 'name-help' : undefined}
        />
        <button
          type="submit"
          disabled={isOffline}
          aria-describedby={accessibilityMode ? 'register-help' : undefined}
        >
          Register
        </button>
        {accessibilityMode && <div id="register-help">Complete registration form</div>}
      </div>

      {enableQRScanner && (
        <div>
          <p>Scan QR code</p>
        </div>
      )}
    </main>
  );
};
