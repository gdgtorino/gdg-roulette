import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_the_draw'

// Set environment variables for testing
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = TEST_DATABASE_URL
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret'

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log('Setting up test database...')

  try {
    // Reset the test database
    execSync('yarn workspace @the-draw/backend prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    })

    // Run migrations
    execSync('yarn workspace @the-draw/backend prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    })

    console.log('Test database setup completed')
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
})

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log('Cleaning up test database...')
  // Add any global cleanup here if needed
})

// Test-level setup - runs before each test
beforeEach(async () => {
  // Clean up database before each test
  // This ensures test isolation
  try {
    // You can add database cleanup logic here
    // For example, truncate tables or reset to known state
  } catch (error) {
    console.error('Failed to clean up before test:', error)
    throw error
  }
})

// Test-level teardown - runs after each test
afterEach(async () => {
  // Clean up after each test if needed
})