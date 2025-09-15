import { ParticipantService } from './ParticipantService';
import { EventService } from './EventService';
import { SessionService } from './SessionService';
import { QRCodeService } from './QRCodeService';
import { EventState } from '../state/EventStateMachine';

export interface RegistrationResult {
  success: boolean;
  participant?: {
    id: string;
    eventId: string;
    name: string;
    registeredAt: Date;
    sessionId?: string;
  };
  sessionId?: string;
  error?: string;
}

export interface SessionRecoveryResult {
  success: boolean;
  participant?: {
    id: string;
    eventId: string;
    name: string;
    registeredAt: Date;
  };
  session?: {
    id: string;
    participantId: string;
    eventId: string;
    createdAt: Date;
    expiresAt: Date;
  };
  error?: string;
}

export interface SessionExtensionResult {
  success: boolean;
  session?: {
    id: string;
    participantId: string;
    eventId: string;
    createdAt: Date;
    expiresAt: Date;
  };
  error?: string;
}

export interface QRCodeResult {
  success: boolean;
  qrCodeData?: string;
  registrationUrl?: string;
  error?: string;
}

export class RegistrationService {
  constructor(
    private participantService: ParticipantService,
    private eventService: EventService,
    private sessionService: SessionService,
  ) {}

  // QRCodeService can be injected later if needed
  private qrCodeService?: QRCodeService;

  /**
   * Register a participant for an event with duplicate prevention
   */
  async registerParticipant(
    eventId: string,
    name: string,
    options?: { rollbackOnSessionFailure?: boolean },
  ): Promise<RegistrationResult> {
    try {
      // Validate name format and length
      const nameValidation = this.validateName(name);
      if (!nameValidation.valid) {
        return {
          success: false,
          error: nameValidation.error,
        };
      }

      // Check if event exists and is in correct state
      const event = await this.eventService.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      // Check event state allows registration
      if (event.state === EventState.INIT) {
        return {
          success: false,
          error: 'Registration is not open for this event',
        };
      }

      if (event.state === EventState.DRAW) {
        return {
          success: false,
          error: 'Registration is closed - draw in progress',
        };
      }

      if (event.state === EventState.CLOSED || event.closed) {
        return {
          success: false,
          error: 'Event is closed',
        };
      }

      if (!event.registrationOpen) {
        return {
          success: false,
          error: 'Registration is not open for this event',
        };
      }

      // Check for duplicate name in this event
      const existingParticipant = await this.participantService.findByEventAndName(eventId, name);
      if (existingParticipant) {
        return {
          success: false,
          error: 'Name already registered for this event',
        };
      }

      // Create participant
      const participant = await this.participantService.create({
        eventId,
        name: name.trim(),
      });

      // Create user session
      try {
        const sessionId = await this.sessionService.createUserSession(participant.id, eventId);

        return {
          success: true,
          participant: {
            ...participant,
            sessionId,
          },
          sessionId,
        };
      } catch {
        // Handle session creation failure
        if (options?.rollbackOnSessionFailure) {
          // Rollback participant creation
          await this.participantService.delete(participant.id);
          return {
            success: false,
            error: 'Registration failed - session could not be created',
          };
        } else {
          // Return success with warning
          return {
            success: false,
            error: 'Registration successful but session creation failed',
            participant,
          };
        }
      }
    } catch {
      return {
        success: false,
        error: 'Registration failed due to system error',
      };
    }
  }

  /**
   * Recover user session from browser storage
   */
  async recoverSession(sessionId: string): Promise<SessionRecoveryResult> {
    try {
      // Validate session
      const session = await this.sessionService.validateUserSession(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session expired or invalid',
        };
      }

      // Get participant details
      const participant = await this.participantService.findById(session.participantId);
      if (!participant) {
        return {
          success: false,
          error: 'Participant not found',
        };
      }

      return {
        success: true,
        participant,
        session,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to recover session',
      };
    }
  }

  /**
   * Extend user session on activity
   */
  async extendUserSession(sessionId: string): Promise<SessionExtensionResult> {
    try {
      const session = await this.sessionService.extendSession(sessionId);

      return {
        success: true,
        session,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to extend session',
      };
    }
  }

  /**
   * Generate registration link for event
   */
  generateRegistrationLink(eventId: string): string {
    if (this.qrCodeService) {
      return this.qrCodeService.generateRegistrationUrl(eventId);
    }
    // Fallback URL generation
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';
    return `${baseUrl}/register/${eventId}`;
  }

  /**
   * Generate QR code for registration link
   */
  async generateQRCode(eventId: string): Promise<QRCodeResult> {
    try {
      if (!this.qrCodeService) {
        return {
          success: false,
          error: 'QR code service not available',
        };
      }

      const registrationUrl = this.generateRegistrationLink(eventId);
      const qrCodeData = await this.qrCodeService.generateQRCode(registrationUrl);

      return {
        success: true,
        qrCodeData,
        registrationUrl,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to generate QR code',
      };
    }
  }

  /**
   * Validate participant name format and length
   */
  private validateName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }

    if (trimmedName.length < 2) {
      return { valid: false, error: 'Name must be at least 2 characters long' };
    }

    if (trimmedName.length > 100) {
      return { valid: false, error: 'Name must be 100 characters or less' };
    }

    // Check for invalid characters (only basic validation)
    if (/^\d+$/.test(trimmedName)) {
      return { valid: false, error: 'Name cannot be only numbers' };
    }

    if (/^[^a-zA-Z\u00C0-\u017F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+$/.test(trimmedName)) {
      return { valid: false, error: 'Name must contain letters' };
    }

    // Check for newlines or other control characters
    if (/[\n\r\t]/.test(trimmedName)) {
      return { valid: false, error: 'Name format is invalid' };
    }

    return { valid: true };
  }
}
