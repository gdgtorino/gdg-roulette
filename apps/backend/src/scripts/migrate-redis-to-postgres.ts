#!/usr/bin/env tsx

import Redis from 'redis';
import { prisma, withTransaction, batchOperation, connectDatabase } from '../lib/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface RedisSession {
  userId: string;
  username: string;
  role: string;
  loginTime: number;
  lastActivity: number;
}

interface RedisDraw {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  registrationOpen: boolean;
  closed: boolean;
  qrCode?: string;
  drawDate?: number;
  maxParticipants?: number;
  prizeDescription?: string;
}

interface RedisTicket {
  id: string;
  drawId: string;
  name: string;
  email?: string;
  phone?: string;
  registeredAt: number;
  metadata?: any;
}

interface RedisWinner {
  id: string;
  drawId: string;
  ticketId: string;
  drawOrder: number;
  drawnAt: number;
  prize?: string;
  claimed: boolean;
  claimedAt?: number;
  notes?: string;
}

class RedisToPostgresMigration {
  private redis: Redis.RedisClientType;

  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
  }

  async connect() {
    await this.redis.connect();
    await connectDatabase();
  }

  async disconnect() {
    await this.redis.disconnect();
    await prisma.$disconnect();
  }

  async migrateUsers() {
    console.log('🔄 Migrating users from Redis...');

    try {
      // Get all user keys from Redis
      const userKeys = await this.redis.keys('user:*');
      console.log(`Found ${userKeys.length} users in Redis`);

      const users = [];
      for (const key of userKeys) {
        const userData = await this.redis.get(key);
        if (userData) {
          const user = JSON.parse(userData);
          const username = key.replace('user:', '');

          users.push({
            id: uuidv4(),
            username,
            password: user.password || await bcrypt.hash('changeme', 10), // Default password
            role: user.role?.toUpperCase() || 'ADMIN',
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Batch insert users
      await batchOperation(users, async (batch) => {
        await prisma.user.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${users.length} users`);
      return users;
    } catch (error) {
      console.error('❌ Error migrating users:', error);
      throw error;
    }
  }

  async migrateSessions() {
    console.log('🔄 Migrating sessions from Redis...');

    try {
      // Get all session keys from Redis
      const sessionKeys = await this.redis.keys('session:*');
      console.log(`Found ${sessionKeys.length} sessions in Redis`);

      const sessions = [];
      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session: RedisSession = JSON.parse(sessionData);
          const sessionId = key.replace('session:', '');

          // Find corresponding user
          const user = await prisma.user.findUnique({
            where: { username: session.username },
          });

          if (user) {
            // Calculate expiration (assuming 24 hour sessions)
            const expiresAt = new Date(session.lastActivity + 24 * 60 * 60 * 1000);

            sessions.push({
              id: uuidv4(),
              sessionId,
              userId: user.id,
              data: {
                loginTime: session.loginTime,
                lastActivity: session.lastActivity,
                role: session.role,
              },
              expiresAt,
              createdAt: new Date(session.loginTime),
              updatedAt: new Date(session.lastActivity),
            });
          }
        }
      }

      // Batch insert sessions
      await batchOperation(sessions, async (batch) => {
        await prisma.session.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${sessions.length} sessions`);
      return sessions;
    } catch (error) {
      console.error('❌ Error migrating sessions:', error);
      throw error;
    }
  }

  async migrateDraws() {
    console.log('🔄 Migrating draws from Redis...');

    try {
      // Get all draw keys from Redis
      const drawKeys = await this.redis.keys('draw:*');
      console.log(`Found ${drawKeys.length} draws in Redis`);

      const draws = [];
      for (const key of drawKeys) {
        const drawData = await this.redis.get(key);
        if (drawData) {
          const draw: RedisDraw = JSON.parse(drawData);

          // Find corresponding user
          const user = await prisma.user.findFirst({
            where: { username: draw.createdBy },
          });

          if (user) {
            draws.push({
              id: draw.id,
              name: draw.name,
              description: draw.description || null,
              createdBy: user.id,
              createdAt: new Date(draw.createdAt),
              updatedAt: new Date(),
              registrationOpen: draw.registrationOpen,
              closed: draw.closed,
              qrCode: draw.qrCode || null,
              drawDate: draw.drawDate ? new Date(draw.drawDate) : null,
              maxParticipants: draw.maxParticipants || null,
              prizeDescription: draw.prizeDescription || null,
            });
          }
        }
      }

      // Batch insert draws
      await batchOperation(draws, async (batch) => {
        await prisma.draw.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${draws.length} draws`);
      return draws;
    } catch (error) {
      console.error('❌ Error migrating draws:', error);
      throw error;
    }
  }

  async migrateTickets() {
    console.log('🔄 Migrating tickets from Redis...');

    try {
      // Get all ticket keys from Redis
      const ticketKeys = await this.redis.keys('ticket:*');
      console.log(`Found ${ticketKeys.length} tickets in Redis`);

      const tickets = [];
      for (const key of ticketKeys) {
        const ticketData = await this.redis.get(key);
        if (ticketData) {
          const ticket: RedisTicket = JSON.parse(ticketData);

          tickets.push({
            id: ticket.id,
            drawId: ticket.drawId,
            name: ticket.name,
            email: ticket.email || null,
            phone: ticket.phone || null,
            registeredAt: new Date(ticket.registeredAt),
            updatedAt: new Date(),
            metadata: ticket.metadata || null,
          });
        }
      }

      // Batch insert tickets
      await batchOperation(tickets, async (batch) => {
        await prisma.ticket.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${tickets.length} tickets`);
      return tickets;
    } catch (error) {
      console.error('❌ Error migrating tickets:', error);
      throw error;
    }
  }

  async migrateWinners() {
    console.log('🔄 Migrating winners from Redis...');

    try {
      // Get all winner keys from Redis
      const winnerKeys = await this.redis.keys('winner:*');
      console.log(`Found ${winnerKeys.length} winners in Redis`);

      const winners = [];
      for (const key of winnerKeys) {
        const winnerData = await this.redis.get(key);
        if (winnerData) {
          const winner: RedisWinner = JSON.parse(winnerData);

          winners.push({
            id: winner.id,
            drawId: winner.drawId,
            ticketId: winner.ticketId,
            drawOrder: winner.drawOrder,
            drawnAt: new Date(winner.drawnAt),
            prize: winner.prize || null,
            claimed: winner.claimed,
            claimedAt: winner.claimedAt ? new Date(winner.claimedAt) : null,
            notes: winner.notes || null,
          });
        }
      }

      // Batch insert winners
      await batchOperation(winners, async (batch) => {
        await prisma.winner.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${winners.length} winners`);
      return winners;
    } catch (error) {
      console.error('❌ Error migrating winners:', error);
      throw error;
    }
  }

  async migrateCache() {
    console.log('🔄 Migrating cache from Redis...');

    try {
      // Get all cache keys (excluding system keys)
      const allKeys = await this.redis.keys('*');
      const cacheKeys = allKeys.filter(key =>
        !key.startsWith('user:') &&
        !key.startsWith('session:') &&
        !key.startsWith('draw:') &&
        !key.startsWith('ticket:') &&
        !key.startsWith('winner:')
      );

      console.log(`Found ${cacheKeys.length} cache entries in Redis`);

      const cacheEntries = [];
      for (const key of cacheKeys) {
        const value = await this.redis.get(key);
        const ttl = await this.redis.ttl(key);

        if (value) {
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value; // Keep as string if not JSON
          }

          const expiresAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;

          cacheEntries.push({
            id: uuidv4(),
            key,
            value: parsedValue,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Batch insert cache entries
      await batchOperation(cacheEntries, async (batch) => {
        await prisma.cache.createMany({
          data: batch,
          skipDuplicates: true,
        });
      });

      console.log(`✅ Successfully migrated ${cacheEntries.length} cache entries`);
      return cacheEntries;
    } catch (error) {
      console.error('❌ Error migrating cache:', error);
      throw error;
    }
  }

  async createDefaultAdmin() {
    console.log('🔄 Creating default admin user...');

    try {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });

      console.log('✅ Default admin user created/verified');
    } catch (error) {
      console.error('❌ Error creating default admin:', error);
      throw error;
    }
  }

  async validateMigration() {
    console.log('🔍 Validating migration...');

    try {
      const counts = await Promise.all([
        prisma.user.count(),
        prisma.session.count(),
        prisma.draw.count(),
        prisma.ticket.count(),
        prisma.winner.count(),
        prisma.cache.count(),
      ]);

      console.log('📊 Migration results:');
      console.log(`  Users: ${counts[0]}`);
      console.log(`  Sessions: ${counts[1]}`);
      console.log(`  Draws: ${counts[2]}`);
      console.log(`  Tickets: ${counts[3]}`);
      console.log(`  Winners: ${counts[4]}`);
      console.log(`  Cache entries: ${counts[5]}`);

      // Note: Foreign key constraints ensure referential integrity,
      // so no need to check for orphaned records

      console.log('✅ Migration validation completed');
    } catch (error) {
      console.error('❌ Error validating migration:', error);
      throw error;
    }
  }

  async run() {
    try {
      console.log('🚀 Starting Redis to PostgreSQL migration...');
      await this.connect();

      await withTransaction(async () => {
        // Run migrations in order due to foreign key constraints
        await this.migrateUsers();
        await this.createDefaultAdmin();
        await this.migrateSessions();
        await this.migrateDraws();
        await this.migrateTickets();
        await this.migrateWinners();
        await this.migrateCache();
      });

      await this.validateMigration();

      console.log('🎉 Migration completed successfully!');
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new RedisToPostgresMigration();
  migration.run()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default RedisToPostgresMigration;