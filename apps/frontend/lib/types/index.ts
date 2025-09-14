export interface Admin {
  id: string;
  username: string;
  password: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  registrationOpen: boolean;
  closed: boolean;
  qrCode: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  registeredAt: Date;
}

export interface Winner {
  id: string;
  eventId: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date;
}

export interface JWTPayload {
  adminId: string;
  username: string;
}

export interface CreateEventRequest {
  name: string;
}

export interface RegisterParticipantRequest {
  eventId: string;
  name?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

export interface AuthResponse {
  token: string;
  admin: {
    id: string;
    username: string;
  };
}

// Socket.io event types for SSE migration
export interface SSEEventData {
  type: 'participantRegistered' | 'registrationToggled' | 'eventClosed' | 'winnerDrawn';
  data: any;
  eventId: string;
}