import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances of Prisma Client in development
  var __prisma: PrismaClient | undefined;
}

// Database configuration for optimal performance
const databaseConfig = {
  // Connection pool configuration
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable query logging in development
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error'] as const
    : ['error'] as const,
  // Error formatting
  errorFormat: 'pretty' as const,
};

// Singleton Prisma Client instance
export const prisma = globalThis.__prisma || new PrismaClient(databaseConfig);

// Prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Connection management
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Failed to disconnect from database:', error);
  }
};

// Health check utility
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

// Transaction utility with retry logic
export const withTransaction = async <T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        maxWait: 5000, // 5 seconds
        timeout: 30000, // 30 seconds
      });
    } catch (error) {
      lastError = error as Error;

      // Log retry attempts
      if (attempt < maxRetries) {
        console.warn(`Transaction failed (attempt ${attempt}/${maxRetries}):`, error);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw lastError!;
};

// Batch operation utility
export const batchOperation = async <T>(
  items: T[],
  operation: (batch: T[]) => Promise<void>,
  batchSize: number = 100
): Promise<void> => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
};

// Cache utilities for database caching
export const cacheManager = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await prisma.cache.findUnique({
        where: { key },
      });

      if (!cached) return null;

      // Check if expired
      if (cached.expiresAt && cached.expiresAt < new Date()) {
        await prisma.cache.delete({ where: { key } });
        return null;
      }

      return cached.value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

      await prisma.cache.upsert({
        where: { key },
        update: {
          value: value as any,
          expiresAt,
          updatedAt: new Date(),
        },
        create: {
          key,
          value: value as any,
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      await prisma.cache.delete({ where: { key } });
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await prisma.cache.deleteMany();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  async cleanup(): Promise<void> {
    try {
      await prisma.cache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  },
};

// Session management utilities
export const sessionManager = {
  async create(sessionId: string, userId: string, data: any, expiresAt: Date): Promise<void> {
    await prisma.session.create({
      data: {
        sessionId,
        userId,
        data,
        expiresAt,
      },
    });
  },

  async get(sessionId: string): Promise<any | null> {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: { user: true },
    });

    if (!session) return null;

    // Check if expired
    if (session.expiresAt < new Date()) {
      await this.delete(sessionId);
      return null;
    }

    return {
      ...session.data,
      user: session.user,
    };
  },

  async update(sessionId: string, data: any, expiresAt?: Date): Promise<void> {
    const updateData: any = { data, updatedAt: new Date() };
    if (expiresAt) updateData.expiresAt = expiresAt;

    await prisma.session.update({
      where: { sessionId },
      data: updateData,
    });
  },

  async delete(sessionId: string): Promise<void> {
    await prisma.session.delete({ where: { sessionId } });
  },

  async cleanup(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  },
};

// Graceful shutdown handler
export const setupGracefulShutdown = (): void => {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

export default prisma;