/* eslint-disable @typescript-eslint/no-unused-vars */
import { SessionService } from './SessionService';
import { EventService } from './EventService';
import { ParticipantService } from './ParticipantService';
import { NotificationService } from './NotificationService';
import { UserStateManager, UserState } from '../state/UserStateManager';

export interface UserStateRecoveryResult {
  success: boolean;
  userState: UserState;
  error?: string;
  networkError?: boolean;
  retryable?: boolean;
  fallbackState?: UserState;
}

export interface UserScreenResult {
  screen: string;
  component: string;
  props: Record<string, unknown>;
}

export interface LiveConnectionResult {
  connected: boolean;
  socket?: WebSocket;
  error?: string;
}

export interface LiveUpdateHandlers {
  onWinnerUpdate?: (winner: { id: string; name: string; drawOrder: number }) => void;
  onParticipantCountUpdate?: (count: { total: number; remaining: number }) => void;
  onPersonalWinnerNotification?: (notification: { drawOrder: number; message: string }) => void;
  onDrawCompletion?: (completion: { totalWinners: number; eventClosed: boolean }) => void;
  onConnectionError?: (error: string) => void;
  onDisconnection?: (info: { code: number; reason: string; reconnecting: boolean }) => void;
  onReconnection?: (info: { attempt: number; success: boolean }) => void;
}

export interface LiveConnectionOptions extends LiveUpdateHandlers {
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

export class UserExperienceService {
  constructor(
    private sessionService: SessionService,
    private eventService: EventService,
    private participantService: ParticipantService,
    private notificationService: NotificationService,
    private userStateManager: UserStateManager,
  ) {}

  /**
   * Recover user state from browser storage after page refresh
   */
  async recoverUserState(
    eventId: string,
    options?: { sessionId?: string },
  ): Promise<UserStateRecoveryResult> {
    try {
      // Load stored state from localStorage
      let storedState = this.userStateManager.loadUserState(eventId);

      // Use provided session ID if available
      if (options?.sessionId && !storedState) {
        storedState = {
          eventId,
          sessionId: options.sessionId,
          userStatus: 'REGISTERED',
          participantId: undefined,
          timestamp: Date.now(),
        };
      }

      // Get current event data
      const event = await this.eventService.findById(eventId);
      if (!event) {
        return {
          success: false,
          userState: this.userStateManager.createDefaultState(eventId),
          error: 'Event not found',
          networkError: false,
          retryable: false,
        };
      }

      let participant;
      let session;
      let winner;

      // If we have stored state, try to recover session and participant data
      if (storedState && this.userStateManager.isStoredStateValid(storedState)) {
        try {
          // Validate session if available
          if (storedState.sessionId) {
            session = await this.sessionService.validateSession(storedState.sessionId);

            if (session && session.valid) {
              // Get participant data
              participant = await this.participantService.findById(session.participantId);

              // Check for winner status
              if (participant) {
                winner = await this.checkWinnerStatus(eventId, participant.id);
              }
            } else {
              // Session expired - we still have participant ID from stored state
              if (storedState.participantId) {
                try {
                  participant = await this.participantService.findById(storedState.participantId);
                } catch (error) {
                  console.warn('Failed to recover participant for expired session:', error);
                }
              }
              // Don't clear stored state yet - let determineUserState handle the expired session
              session = null; // Mark session as invalid
            }
          }
        } catch (error) {
          console.warn('Failed to recover session:', error);
          // Clear corrupted state
          this.userStateManager.clearUserState(eventId);
          storedState = null;
        }
      }

      // Determine current user state
      const sessionWasProvided = !!(storedState?.sessionId || options?.sessionId);
      const userState = await this.userStateManager.determineUserState(
        eventId,
        event,
        participant,
        session,
        winner,
        sessionWasProvided,
      );

      // Handle session expiration
      if (userState.status === 'SESSION_EXPIRED') {
        // Clear localStorage for expired sessions
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(`userState_${eventId}`);
        }
        this.userStateManager.clearUserState(eventId);
      }

      return {
        success: true,
        userState,
      };
    } catch (error) {
      const isNetworkError = error instanceof Error &&
        (error.message.includes('Network') || error.message.includes('network') ||
         error.message.includes('NETWORK') || error.message.includes('connection') ||
         error.message.includes('timeout') || error.message.includes('TIMEOUT'));

      return {
        success: false,
        userState: this.userStateManager.createDefaultState(eventId),
        error: 'Failed to recover user state',
        networkError: isNetworkError,
        retryable: isNetworkError,
        fallbackState: {
          status: 'ERROR',
          screen: 'ERROR',
          message: 'Unable to connect to event service',
        },
      };
    }
  }

  /**
   * Save user state to persistent storage
   */
  async saveUserState(eventId: string, userState: Partial<UserState>): Promise<void> {
    try {
      this.userStateManager.saveUserState(eventId, userState);
    } catch (error) {
      console.warn('Failed to save user state:', error);
    }
  }

  /**
   * Determine which screen to show based on user state
   */
  async determineUserScreen(eventId: string, context?: Record<string, unknown>): Promise<UserScreenResult> {
    const recovery = await this.recoverUserState(eventId, context);
    const userState = recovery.userState;

    switch (userState.screen) {
      case 'REGISTRATION':
        return {
          screen: 'REGISTRATION',
          component: 'RegistrationScreen',
          props: {
            event: userState.event,
            message: userState.message,
          },
        };

      case 'WAITING':
        return {
          screen: 'WAITING',
          component: 'WaitingScreen',
          props: {
            event: userState.event,
            participant: userState.participant,
            session: userState.session,
          },
        };

      case 'LOTTERY_LIVE':
        return {
          screen: 'LOTTERY_LIVE',
          component: 'LotteryScreen',
          props: {
            event: userState.event,
            participant: userState.participant,
            isLive: context?.liveDrawActive || userState.event?.isLive || false,
          },
        };

      case 'WINNER_RESULT':
        return {
          screen: 'WINNER_RESULT',
          component: 'ResultScreen',
          props: {
            isWinner: true,
            winner: userState.winner,
            event: userState.event,
            participant: userState.participant,
            drawOrder: userState.winner?.drawOrder,
          },
        };

      case 'NOT_WINNER_RESULT':
        return {
          screen: 'NOT_WINNER_RESULT',
          component: 'ResultScreen',
          props: {
            isWinner: false,
            participant: userState.participant,
            event: userState.event,
          },
        };

      case 'EVENT_CLOSED':
        return {
          screen: 'EVENT_CLOSED',
          component: 'ClosedEventScreen',
          props: {
            event: userState.event,
          },
        };

      case 'ERROR':
      default:
        return {
          screen: 'ERROR',
          component: 'ErrorScreen',
          props: {
            error: userState.error || 'Unknown error occurred',
          },
        };
    }
  }

  /**
   * Connect to live updates during lottery draw
   */
  async connectToLiveUpdates(
    eventId: string,
    participantId: string,
    options?: LiveConnectionOptions,
  ): Promise<LiveConnectionResult> {
    try {
      const socket = await this.notificationService.connectToLiveUpdates(eventId, participantId);

      if (socket && socket.readyState === 1) { // WebSocket.OPEN
        this.setupLiveUpdateHandlers(socket, options || {});
        return {
          connected: true,
          socket,
        };
      } else {
        throw new Error('WebSocket connection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      // Handle auto-reconnection
      if (options?.autoReconnect && options?.maxReconnectAttempts) {
        return await this.attemptReconnection(eventId, participantId, options, 1);
      }

      // Call error handler
      if (options?.onConnectionError) {
        options.onConnectionError(errorMessage);
      }

      return {
        connected: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Attempt automatic reconnection with retry logic
   */
  private async attemptReconnection(
    eventId: string,
    participantId: string,
    options: LiveConnectionOptions,
    attempt: number,
  ): Promise<LiveConnectionResult> {
    if (attempt > (options.maxReconnectAttempts || 3)) {
      if (options.onReconnection) {
        options.onReconnection({ attempt, success: false });
      }
      return {
        connected: false,
        error: 'Max reconnection attempts exceeded',
      };
    }

    try {
      // Wait before reconnecting (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));

      const result = await this.connectToLiveUpdates(eventId, participantId, {
        ...options,
        autoReconnect: false, // Prevent infinite recursion
      });

      if (result.connected) {
        if (options.onReconnection) {
          // attempt represents the reconnection attempt number, but total attempts = attempt + 1 (initial attempt)
          options.onReconnection({ attempt: attempt + 1, success: true });
        }
      } else {
        // Try again
        return await this.attemptReconnection(eventId, participantId, options, attempt + 1);
      }

      return result;
    } catch (error) {
      console.warn('Reconnection attempt failed:', error);
      return await this.attemptReconnection(eventId, participantId, options, attempt + 1);
    }
  }

  /**
   * Setup WebSocket message handlers for live updates
   */
  private setupLiveUpdateHandlers(socket: WebSocket, handlers: LiveUpdateHandlers): void {
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'WINNER_ANNOUNCED':
            if (handlers.onWinnerUpdate && data.winner) {
              handlers.onWinnerUpdate(data.winner);
            }
            break;

          case 'PARTICIPANT_COUNT_UPDATE':
            if (handlers.onParticipantCountUpdate) {
              handlers.onParticipantCountUpdate({
                total: data.totalParticipants,
                remaining: data.remainingParticipants,
              });
            }
            break;

          case 'YOU_ARE_WINNER':
            if (handlers.onPersonalWinnerNotification && data.winner) {
              handlers.onPersonalWinnerNotification({
                drawOrder: data.winner.drawOrder,
                message: data.congratulationsMessage,
              });
            }
            break;

          case 'DRAW_COMPLETED':
            if (handlers.onDrawCompletion) {
              handlers.onDrawCompletion({
                totalWinners: data.totalWinners,
                eventClosed: data.eventClosed,
              });
            }
            break;
        }
      } catch (error) {
        console.warn('Failed to parse WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      if (handlers.onDisconnection) {
        handlers.onDisconnection({
          code: event.code,
          reason: event.reason,
          reconnecting: true,
        });
      }
    };

    socket.onerror = (error) => {
      if (handlers.onConnectionError) {
        handlers.onConnectionError('WebSocket error occurred');
      }
    };
  }

  /**
   * Check if participant is a winner
   */
  private async checkWinnerStatus(_eventId: string, _participantId: string): Promise<{ isWinner: boolean; drawOrder?: number; drawnAt?: Date }> {
    try {
      // This would typically call a WinnerService method
      // For now, return false (no winner found)
      return { isWinner: false };
    } catch (error) {
      console.warn('Failed to check winner status:', error);
      return { isWinner: false };
    }
  }

  /**
   * Update user state and persist changes
   */
  async updateUserState(eventId: string, updates: Partial<UserState>): Promise<UserState> {
    const current = await this.recoverUserState(eventId);
    const newState = {
      ...current.userState,
      ...updates,
    };

    await this.saveUserState(eventId, newState);
    return newState;
  }

  /**
   * Clear user state (logout)
   */
  async clearUserState(eventId: string): Promise<void> {
    this.userStateManager.clearUserState(eventId);
  }
}
