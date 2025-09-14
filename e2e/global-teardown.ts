import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  // Global teardown for E2E tests
  console.log('Starting global teardown for E2E tests...')

  // Clean up test database
  console.log('Cleaning up test database...')

  // You can add database cleanup here
  // await cleanupTestDatabase()

  console.log('Global teardown completed')
}

export default globalTeardown