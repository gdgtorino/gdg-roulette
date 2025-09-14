// API Routes
export const API_ROUTES = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/auth/login',
    NEXTAUTH: '/api/auth/[...nextauth]'
  },
  ADMIN: {
    BASE: '/api/admin',
    BY_USERNAME: (username: string) => `/api/admin/${username}`
  },
  EVENTS: {
    BASE: '/api/events',
    BY_ID: (eventId: string) => `/api/events/${eventId}`,
    REGISTRATION: (eventId: string) => `/api/events/${eventId}/registration`,
    CLOSE: (eventId: string) => `/api/events/${eventId}/close`,
    PARTICIPANTS: (eventId: string) => `/api/events/${eventId}/participants`,
    PARTICIPANT_BY_ID: (eventId: string, participantId: string) =>
      `/api/events/${eventId}/participants/${participantId}`,
    CHECK_WINNER: (eventId: string, participantId: string) =>
      `/api/events/${eventId}/participants/${participantId}/winner`,
    CHECK_NAME: (eventId: string, name: string) =>
      `/api/events/${eventId}/check-name/${name}`,
    FIND_PARTICIPANT: (eventId: string, name: string) =>
      `/api/events/${eventId}/find-participant/${name}`,
    DRAW: (eventId: string) => `/api/events/${eventId}/draw`,
    WINNERS: (eventId: string) => `/api/events/${eventId}/winners`,
    STREAM: (eventId: string) => `/api/events/${eventId}/stream`,
    PARTICIPANTS_STREAM: (eventId: string) => `/api/events/${eventId}/participants/stream`,
    WINNERS_STREAM: (eventId: string) => `/api/events/${eventId}/winners/stream`
  },
  TRPC: '/api/trpc',
  DOCS: '/api/docs'
} as const;

// tRPC Routes
export const TRPC_ROUTES = {
  AUTH: {
    LOGIN: 'auth.login'
  },
  ADMIN: {
    GET_ALL: 'admin.getAll',
    CREATE: 'admin.create',
    DELETE: 'admin.delete'
  },
  EVENTS: {
    GET_ALL: 'events.getAll',
    CREATE: 'events.create',
    GET_BY_ID: 'events.getById',
    DELETE: 'events.delete',
    TOGGLE_REGISTRATION: 'events.toggleRegistration',
    CLOSE: 'events.close',
    REGISTER_PARTICIPANT: 'events.registerParticipant',
    GET_PARTICIPANTS: 'events.getParticipants',
    DRAW_WINNER: 'events.drawWinner',
    GET_WINNERS: 'events.getWinners',
    CHECK_NAME_AVAILABILITY: 'events.checkNameAvailability',
    FIND_PARTICIPANT: 'events.findParticipant',
    CHECK_WINNER: 'events.checkWinner'
  }
} as const;

// Event types for SSE
export const SSE_EVENT_TYPES = {
  CONNECTED: 'connected',
  PARTICIPANT_REGISTERED: 'participantRegistered',
  REGISTRATION_TOGGLED: 'registrationToggled',
  EVENT_CLOSED: 'eventClosed',
  WINNER_DRAWN: 'winnerDrawn'
} as const;

// Default values
export const DEFAULTS = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin123',
  QR_DATA_BASE_URL: process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL || 'http://localhost:3000'
} as const;