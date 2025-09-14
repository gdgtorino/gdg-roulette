import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Global setup for E2E tests
  console.log('Starting global setup for E2E tests...')

  // Setup test database
  console.log('Setting up test database...')

  // You can add database seeding here
  // await setupTestDatabase()

  // Create a browser instance for authentication setup
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Pre-authenticate admin user if needed
  // This creates a session that can be reused across tests
  try {
    await page.goto('/admin/login')
    // Add authentication logic here if needed
    console.log('Authentication setup completed')
  } catch (error) {
    console.log('Authentication setup skipped - no auth endpoint available')
  }

  await browser.close()

  console.log('Global setup completed')
}

export default globalSetup