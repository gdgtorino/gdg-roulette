// Test data factories for creating mock objects
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

export interface MockEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockLottery {
  id: string;
  eventId: string;
  name: string;
  description: string;
  totalTickets: number;
  ticketPrice: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  winnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockLotteryEntry {
  id: string;
  lotteryId: string;
  userId: string;
  ticketNumber: string;
  createdAt: Date;
}

// User factory
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const timestamp = new Date();
  const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    email: `user-${id}@example.com`,
    name: `Test User ${id}`,
    role: 'USER',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

// Admin factory
export function createMockAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    role: 'ADMIN',
    name: 'Test Admin',
    email: 'admin@example.com',
    ...overrides,
  });
}

// Event factory
export function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
  const timestamp = new Date();
  const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    title: `Test Event ${id}`,
    description: `Description for test event ${id}`,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    maxParticipants: 100,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

// Lottery factory
export function createMockLottery(overrides: Partial<MockLottery> = {}): MockLottery {
  const timestamp = new Date();
  const id = `lottery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const eventId = overrides.eventId || `event-${Date.now()}`;

  return {
    id,
    eventId,
    name: `Test Lottery ${id}`,
    description: `Description for test lottery ${id}`,
    totalTickets: 100,
    ticketPrice: 10.0,
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

// Lottery entry factory
export function createMockLotteryEntry(
  overrides: Partial<MockLotteryEntry> = {},
): MockLotteryEntry {
  const timestamp = new Date();
  const id = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    lotteryId: overrides.lotteryId || `lottery-${Date.now()}`,
    userId: overrides.userId || `user-${Date.now()}`,
    ticketNumber: Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0'),
    createdAt: timestamp,
    ...overrides,
  };
}

// Helper to create multiple items
export function createMockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
  return Array.from({ length: count }, () => createMockUser(overrides));
}

export function createMockEvents(count: number, overrides: Partial<MockEvent> = {}): MockEvent[] {
  return Array.from({ length: count }, () => createMockEvent(overrides));
}

export function createMockLotteries(
  count: number,
  overrides: Partial<MockLottery> = {},
): MockLottery[] {
  return Array.from({ length: count }, () => createMockLottery(overrides));
}

export function createMockLotteryEntries(
  count: number,
  overrides: Partial<MockLotteryEntry> = {},
): MockLotteryEntry[] {
  return Array.from({ length: count }, () => createMockLotteryEntry(overrides));
}

// Complex scenario factories
export function createMockEventWithLotteries(lotteryCount: number = 2): {
  event: MockEvent;
  lotteries: MockLottery[];
} {
  const event = createMockEvent();
  const lotteries = createMockLotteries(lotteryCount, { eventId: event.id });

  return { event, lotteries };
}

export function createMockLotteryWithEntries(entryCount: number = 5): {
  lottery: MockLottery;
  entries: MockLotteryEntry[];
} {
  const lottery = createMockLottery();
  const entries = createMockLotteryEntries(entryCount, { lotteryId: lottery.id });

  return { lottery, entries };
}
