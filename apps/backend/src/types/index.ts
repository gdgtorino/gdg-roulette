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