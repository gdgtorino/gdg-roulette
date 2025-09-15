import { PrismaClient } from '@prisma/client';

// Test database utilities
let prismaClient: PrismaClient;

export function getTestPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
  }
  return prismaClient;
}

// Database cleanup helpers
export async function cleanupDatabase() {
  const prisma = getTestPrismaClient();

  // Clean up in reverse order of dependencies
  await prisma.lotteryEntry.deleteMany();
  await prisma.lottery.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
}

// Database seeding helpers
export async function createTestUser(data: Partial<any> = {}) {
  const prisma = getTestPrismaClient();

  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'USER',
      ...data,
    },
  });
}

export async function createTestAdmin(data: Partial<any> = {}) {
  const prisma = getTestPrismaClient();

  return prisma.user.create({
    data: {
      email: `admin-${Date.now()}@example.com`,
      name: 'Test Admin',
      role: 'ADMIN',
      ...data,
    },
  });
}

export async function createTestEvent(data: Partial<any> = {}) {
  const prisma = getTestPrismaClient();

  return prisma.event.create({
    data: {
      title: 'Test Event',
      description: 'A test event',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      maxParticipants: 100,
      isActive: true,
      ...data,
    },
  });
}

export async function createTestLottery(eventId: string, data: Partial<any> = {}) {
  const prisma = getTestPrismaClient();

  return prisma.lottery.create({
    data: {
      eventId,
      name: 'Test Lottery',
      description: 'A test lottery',
      totalTickets: 100,
      ticketPrice: 10.0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
      ...data,
    },
  });
}

export async function createTestLotteryEntry(
  lotteryId: string,
  userId: string,
  data: Partial<any> = {},
) {
  const prisma = getTestPrismaClient();

  return prisma.lotteryEntry.create({
    data: {
      lotteryId,
      userId,
      ticketNumber: Math.floor(Math.random() * 1000000).toString(),
      ...data,
    },
  });
}

// Disconnect helper for test cleanup
export async function disconnectTestDatabase() {
  if (prismaClient) {
    await prismaClient.$disconnect();
  }
}
