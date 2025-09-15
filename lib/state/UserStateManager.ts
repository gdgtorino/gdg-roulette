import { EventState } from './EventStateMachine';

export interface UserState {
  status:
    | 'UNREGISTERED'
    | 'REGISTERED'
    | 'SESSION_EXPIRED'
    | 'WINNER'
    | 'NOT_WINNER'
    | 'ERROR'
    | 'EVENT_CLOSED';
  screen:
    | 'REGISTRATION'
    | 'WAITING'
    | 'LOTTERY_LIVE'
    | 'WINNER_RESULT'
    | 'NOT_WINNER_RESULT'
    | 'ERROR'
    | 'EVENT_CLOSED';
  event?: {
    id: string;
    name: string;
    state: EventState;
    registrationOpen: boolean;
    closed: boolean;
    isLive?: boolean;
  };
  participant?: {
    id: string;
    name: string;
    eventId: string;
    registeredAt: Date;
  };
  session?: {
    id: string;
    participantId: string;
    eventId: string;
    valid: boolean;
    expiresAt?: Date;
  };
  winner?: {
    id: string;
    participantId: string;
    participantName: string;
    drawOrder: number;
    drawnAt: Date;
  };
  message?: string;
  error?: string;
  action?: string;
}

export interface StoredUserState {
  eventId: string;
  sessionId?: string;
  userStatus: string;
  participantId?: string;
  timestamp: number;
}

export class UserStateManager {
  private readonly STORAGE_PREFIX = 'userState_';

  /**
   * Determine user state based on event and participant data
   */
  async determineUserState(
    eventId: string,
    event: any,
    participant?: any,
    session?: any,
    winner?: any,
    sessionWasProvided?: boolean,
  ): Promise<UserState> {
    try {
      // Handle event not found
      if (!event) {
        return {
          status: 'ERROR',
          screen: 'ERROR',
          error: 'Event not found',
        };
      }

      // Handle closed events
      if (event.state === EventState.CLOSED || event.closed) {
        if (participant && winner) {
          return {
            status: 'WINNER',
            screen: 'WINNER_RESULT',
            event,
            participant,
            winner,
          };
        } else if (participant) {
          return {
            status: 'NOT_WINNER',
            screen: 'NOT_WINNER_RESULT',
            event,
            participant,
          };
        } else {
          return {
            status: 'EVENT_CLOSED',
            screen: 'EVENT_CLOSED',
            event,
          };
        }
      }

      // Handle session expiration
      if ((participant && (!session || !session.valid)) || (sessionWasProvided && !session)) {
        return {
          status: 'SESSION_EXPIRED',
          screen: 'REGISTRATION',
          event,
          message: 'Your session has expired. Please register again.',
          action: 'SHOW_REAUTH_FORM',
        };
      }

      // Handle registered users during draw
      if (participant && session && session.valid) {
        if (event.state === EventState.DRAW) {
          if (event.isLive) {
            return {
              status: 'REGISTERED',
              screen: 'LOTTERY_LIVE',
              event,
              participant,
              session,
            };
          } else {
            return {
              status: 'REGISTERED',
              screen: 'WAITING',
              event,
              participant,
              session,
            };
          }
        } else if (event.state === EventState.REGISTRATION) {
          return {
            status: 'REGISTERED',
            screen: 'WAITING',
            event,
            participant,
            session,
          };
        }
      }

      // Handle unregistered users
      if (event.state === EventState.REGISTRATION && event.registrationOpen) {
        return {
          status: 'UNREGISTERED',
          screen: 'REGISTRATION',
          event,
        };
      }

      // Default fallback
      return {
        status: 'UNREGISTERED',
        screen: 'REGISTRATION',
        event,
      };
    } catch (error) {
      return {
        status: 'ERROR',
        screen: 'ERROR',
        error: 'Failed to determine user state',
      };
    }
  }

  /**
   * Save user state to browser localStorage
   */
  saveUserState(eventId: string, state: Partial<UserState>): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return; // Skip if not in browser environment
      }

      const storedState: StoredUserState = {
        eventId,
        sessionId: state.session?.id,
        userStatus: state.status || 'UNREGISTERED',
        participantId: state.participant?.id,
        timestamp: Date.now(),
      };

      const key = `${this.STORAGE_PREFIX}${eventId}`;
      window.localStorage.setItem(key, JSON.stringify(storedState));
    } catch (error) {
      console.warn('Failed to save user state to localStorage:', error);
    }
  }

  /**
   * Load user state from browser localStorage
   */
  loadUserState(eventId: string): StoredUserState | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null; // Skip if not in browser environment
      }

      const key = `${this.STORAGE_PREFIX}${eventId}`;
      const stored = window.localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      return JSON.parse(stored) as StoredUserState;
    } catch (error) {
      console.warn('Failed to load user state from localStorage:', error);
      // Clear corrupted data
      this.clearUserState(eventId);
      return null;
    }
  }

  /**
   * Clear user state from browser localStorage
   */
  clearUserState(eventId: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return; // Skip if not in browser environment
      }

      const key = `${this.STORAGE_PREFIX}${eventId}`;
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to clear user state from localStorage:', error);
    }
  }

  /**
   * Check if stored state is still valid (not too old)
   */
  isStoredStateValid(storedState: StoredUserState, maxAgeHours: number = 24): boolean {
    const now = Date.now();
    const stateAge = now - storedState.timestamp;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

    return stateAge <= maxAgeMs;
  }

  /**
   * Update user state status
   */
  updateUserStatus(
    currentState: UserState,
    newStatus: UserState['status'],
    additionalData?: Partial<UserState>,
  ): UserState {
    return {
      ...currentState,
      status: newStatus,
      ...additionalData,
    };
  }

  /**
   * Determine appropriate screen based on user status and event state
   */
  getScreenForStatus(
    status: UserState['status'],
    eventState: EventState,
    hasWinner: boolean = false,
  ): UserState['screen'] {
    switch (status) {
      case 'UNREGISTERED':
        return 'REGISTRATION';

      case 'REGISTERED':
        if (eventState === EventState.DRAW) {
          return 'LOTTERY_LIVE';
        }
        return 'WAITING';

      case 'WINNER':
        return 'WINNER_RESULT';

      case 'NOT_WINNER':
        return 'NOT_WINNER_RESULT';

      case 'SESSION_EXPIRED':
        return 'REGISTRATION';

      case 'EVENT_CLOSED':
        return 'EVENT_CLOSED';

      case 'ERROR':
      default:
        return 'ERROR';
    }
  }

  /**
   * Validate user state consistency
   */
  validateUserState(state: UserState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!state.status || !state.screen) {
      errors.push('Missing required status or screen');
    }

    // Check status-screen consistency
    if (state.status === 'REGISTERED' && !state.participant) {
      errors.push('Registered status requires participant data');
    }

    if (state.status === 'WINNER' && !state.winner) {
      errors.push('Winner status requires winner data');
    }

    if (state.status === 'SESSION_EXPIRED' && !state.message) {
      errors.push('Session expired status should include message');
    }

    // Check event data consistency
    if (state.event) {
      if (state.event.state === EventState.CLOSED && state.status === 'UNREGISTERED') {
        errors.push('Cannot be unregistered for closed event');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create default user state for event
   */
  createDefaultState(eventId: string): UserState {
    return {
      status: 'UNREGISTERED',
      screen: 'REGISTRATION',
      event: {
        id: eventId,
        name: 'Unknown Event',
        state: EventState.INIT,
        registrationOpen: false,
        closed: false,
      },
    };
  }

  /**
   * Merge stored state with current data
   */
  mergeStoredState(
    storedState: StoredUserState,
    currentEventData: any,
    participantData?: any,
    sessionData?: any,
    winnerData?: any,
  ): UserState {
    return {
      status: storedState.userStatus as UserState['status'],
      screen: this.getScreenForStatus(
        storedState.userStatus as UserState['status'],
        currentEventData?.state,
        !!winnerData,
      ),
      event: currentEventData,
      participant: participantData,
      session: sessionData,
      winner: winnerData,
    };
  }
}
