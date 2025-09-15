import { EventService } from '../services/EventService';
import { LotteryService } from '../services/LotteryService';
import { Event } from '../types';

export enum EventState {
  INIT = 'INIT',
  REGISTRATION = 'REGISTRATION',
  DRAW = 'DRAW',
  CLOSED = 'CLOSED'
}

export interface StateTransitionResult {
  success: boolean;
  event?: Event & { state: EventState };
  error?: string;
}

export interface EventCreationData {
  name: string;
  description?: string;
  createdBy: string;
  maxParticipants?: number;
}

export class EventStateMachine {
  constructor(
    private eventService: EventService,
    private lotteryService: LotteryService
  ) {}

  /**
   * Create new event in INIT state
   */
  async createEvent(eventData: EventCreationData): Promise<Event & { state: EventState }> {
    if (!eventData.createdBy) {
      throw new Error('Admin ID is required to create event');
    }

    // Use createBasicEvent to avoid automatic QR code generation
    const event = await this.eventService.createBasicEvent({
      ...eventData,
      state: EventState.INIT,
      registrationOpen: false,
      closed: false
    });

    return {
      ...event,
      state: EventState.INIT
    };
  }

  /**
   * Transition from INIT to REGISTRATION
   */
  async openRegistration(eventId: string, adminId: string): Promise<Event & { state: EventState }> {
    const event = await this.validateEventAndOwnership(eventId, adminId);

    // Check if event is closed
    if (event.closed) {
      throw new Error('Cannot modify closed event');
    }

    // Validate current state
    const currentState = this.getEventState(event);
    if (currentState !== EventState.INIT) {
      throw new Error('Can only open registration from INIT state');
    }

    const updatedEvent = await this.eventService.updateEvent(eventId, {
      state: EventState.REGISTRATION,
      registrationOpen: true
    });

    return {
      ...updatedEvent,
      state: EventState.REGISTRATION
    };
  }

  /**
   * Close registration (but keep in REGISTRATION state)
   */
  async closeRegistration(eventId: string, adminId: string): Promise<Event & { state: EventState }> {
    const event = await this.validateEventAndOwnership(eventId, adminId);

    if (event.closed) {
      throw new Error('Cannot modify closed event');
    }

    const currentState = this.getEventState(event);
    if (currentState !== EventState.REGISTRATION) {
      throw new Error('Can only close registration from REGISTRATION state');
    }

    const updatedEvent = await this.eventService.updateEvent(eventId, {
      registrationOpen: false
    });

    return {
      ...updatedEvent,
      state: EventState.REGISTRATION
    };
  }

  /**
   * Transition from REGISTRATION to DRAW
   */
  async startDraw(eventId: string, adminId: string): Promise<Event & { state: EventState }> {
    const event = await this.validateEventAndOwnership(eventId, adminId);

    if (event.closed) {
      throw new Error('Cannot modify closed event');
    }

    const currentState = this.getEventState(event);
    if (currentState !== EventState.REGISTRATION) {
      throw new Error('Can only start draw from REGISTRATION state');
    }

    // Check if there are participants
    const participantCount = await this.eventService.getParticipantCount(eventId);
    if (participantCount === 0) {
      throw new Error('Cannot start draw without participants');
    }

    const updatedEvent = await this.eventService.updateEvent(eventId, {
      state: EventState.DRAW,
      registrationOpen: false
    });

    return {
      ...updatedEvent,
      state: EventState.DRAW
    };
  }

  /**
   * Transition from DRAW to CLOSED
   */
  async closeEvent(eventId: string, adminId: string): Promise<Event & { state: EventState }> {
    const event = await this.validateEventAndOwnership(eventId, adminId);

    const currentState = this.getEventState(event);
    if (currentState !== EventState.DRAW) {
      throw new Error('Can only close event from DRAW state');
    }

    const updatedEvent = await this.eventService.updateEvent(eventId, {
      state: EventState.CLOSED,
      closed: true
    });

    return {
      ...updatedEvent,
      state: EventState.CLOSED
    };
  }

  /**
   * Auto-close event when all participants are drawn
   */
  async checkAutoClose(eventId: string): Promise<Event & { state: EventState }> {
    const event = await this.eventService.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const currentState = this.getEventState(event);
    if (currentState !== EventState.DRAW) {
      return {
        ...event,
        state: currentState
      };
    }

    const participantCount = await this.eventService.getParticipantCount(eventId);
    const winnerCount = await this.lotteryService.getWinnerCount(eventId);

    if (participantCount > 0 && winnerCount >= participantCount) {
      // All participants have been drawn, auto-close the event
      const updatedEvent = await this.eventService.updateEvent(eventId, {
        state: EventState.CLOSED,
        closed: true
      });

      return {
        ...updatedEvent,
        state: EventState.CLOSED
      };
    }

    return {
      ...event,
      state: currentState
    };
  }

  /**
   * Check if participants can register for this event
   */
  canRegisterParticipants(event: Event & { state?: EventState }): boolean {
    const state = event.state || this.getEventState(event);
    return state === EventState.REGISTRATION && event.registrationOpen && !event.closed;
  }

  /**
   * Check if draw can be performed for this event
   */
  canPerformDraw(event: Event & { state?: EventState }): boolean {
    const state = event.state || this.getEventState(event);
    return state === EventState.DRAW && !event.closed;
  }

  /**
   * Check if event can be modified
   */
  canModifyEvent(event: Event & { state?: EventState }): boolean {
    const state = event.state || this.getEventState(event);
    return state !== EventState.CLOSED && !event.closed;
  }

  /**
   * Check if results can be viewed
   */
  canViewResults(event: Event & { state?: EventState }): boolean {
    const state = event.state || this.getEventState(event);
    return state === EventState.DRAW || state === EventState.CLOSED;
  }

  /**
   * Check if data can be exported
   */
  canExportData(event: Event & { state?: EventState }): boolean {
    const state = event.state || this.getEventState(event);
    return state === EventState.CLOSED;
  }

  /**
   * Get current state of an event
   */
  private getEventState(event: Event): EventState {
    // Determine state based on event properties if state field is not available
    if (event.closed) {
      return EventState.CLOSED;
    }

    if (event.registrationOpen) {
      return EventState.REGISTRATION;
    }

    // Check if there are winners (indicating draw has started)
    if (event.winners && event.winners.length > 0) {
      return EventState.DRAW;
    }

    // Check if registration has been opened before (participants exist but registration is closed)
    if (event.participants && event.participants.length > 0 && !event.registrationOpen) {
      return EventState.DRAW;
    }

    return EventState.INIT;
  }

  /**
   * Validate event exists and admin owns it
   */
  private async validateEventAndOwnership(eventId: string, adminId: string): Promise<Event> {
    const event = await this.eventService.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.createdBy !== adminId) {
      throw new Error('Only event creator can modify event state');
    }

    // Validate state consistency
    const currentState = this.getEventState(event);
    if (!Object.values(EventState).includes(currentState)) {
      throw new Error('Invalid event state');
    }

    return event;
  }

  /**
   * Get valid transitions from current state
   */
  getValidTransitions(currentState: EventState): EventState[] {
    switch (currentState) {
      case EventState.INIT:
        return [EventState.REGISTRATION];
      case EventState.REGISTRATION:
        return [EventState.DRAW];
      case EventState.DRAW:
        return [EventState.CLOSED];
      case EventState.CLOSED:
        return []; // No transitions from closed state
      default:
        return [];
    }
  }

  /**
   * Check if transition is valid
   */
  isValidTransition(from: EventState, to: EventState): boolean {
    const validTransitions = this.getValidTransitions(from);
    return validTransitions.includes(to);
  }

  /**
   * Get state description
   */
  getStateDescription(state: EventState): string {
    switch (state) {
      case EventState.INIT:
        return 'Event created, registration not yet open';
      case EventState.REGISTRATION:
        return 'Participant registration is open';
      case EventState.DRAW:
        return 'Registration closed, lottery draw in progress';
      case EventState.CLOSED:
        return 'Event completed and closed';
      default:
        return 'Unknown state';
    }
  }
}