import { execSync } from 'child_process'
import { PrismaClient, UserRole } from '@prisma/client'

// Database test setup utilities
export async function setupTestDatabase() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_the_draw'

  console.log('Setting up test database...')

  try {
    // Create test database if it doesn't exist
    const createDbCommand = `createdb test_the_draw -h localhost -U test || echo "Database might already exist"`
    execSync(createDbCommand, { stdio: 'inherit' })

    // Reset the test database schema
    execSync('yarn workspace @the-draw/backend prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Run migrations
    execSync('yarn workspace @the-draw/backend prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Generate Prisma client
    execSync('yarn workspace @the-draw/backend prisma generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    console.log('Test database setup completed successfully')
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

export async function teardownTestDatabase() {
  console.log('Tearing down test database...')

  try {
    // Drop test database
    const dropDbCommand = `dropdb test_the_draw -h localhost -U test || echo "Database might not exist"`
    execSync(dropDbCommand, { stdio: 'inherit' })

    console.log('Test database teardown completed')
  } catch (error) {
    console.error('Failed to teardown test database:', error)
    // Don't throw here as this is cleanup
  }
}

export async function seedTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    console.log('Seeding test database...')

    // Create test admin user
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: 'test123',
        role: UserRole.ADMIN,
      },
    })

    // Create test regular user
    const regularUser = await prisma.user.create({
      data: {
        username: 'user',
        password: 'test123',
        role: UserRole.OPERATOR,
      },
    })

    // Create test event (commented out as models may not exist)
    // const testEvent = await prisma.event.create({
    //   data: {
    //     title: 'Test Event',
    //     description: 'A test event for testing purposes',
    //     startDate: new Date(),
    //     endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    //     maxParticipants: 100,
    //     isActive: true,
    //   },
    // })

    // Create test lottery (commented out as models may not exist)
    // const testLottery = await prisma.lottery.create({
    //   data: {
    //     eventId: testEvent.id,
    //     name: 'Test Lottery',
    //     description: 'A test lottery for testing purposes',
    //     totalTickets: 50,
    //     ticketPrice: 5.0,
    //     startDate: new Date(),
    //     endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
    //     isActive: true,
    //   },
    // })

    console.log('Test database seeded successfully')
    return {
      adminUser,
      regularUser,
      // testEvent,
      // testLottery,
    }
  } catch (error) {
    console.error('Failed to seed test database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

export async function cleanTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    // Clean up in reverse order of dependencies (commented out as models may not exist)
    // await prisma.lotteryEntry.deleteMany()
    // await prisma.lottery.deleteMany()
    // await prisma.event.deleteMany()
    await prisma.user.deleteMany()

    console.log('Test database cleaned successfully')
  } catch (error) {
    console.error('Failed to clean test database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}