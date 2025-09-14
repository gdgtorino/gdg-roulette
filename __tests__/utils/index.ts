// Re-export all test utilities for easy importing
export * from './render'
export * from './database'
export * from './auth'
export * from './msw'
export * from './factories'

// Common test setup function
export function setupTestEnvironment() {
  // This can be used in test files to set up common test environment
  // including MSW, authentication mocks, etc.

  // Set up MSW
  const { setupMSW } = require('./msw')
  setupMSW()

  // Set up authentication mocks
  const { mockAuthentication } = require('./auth')
  mockAuthentication()
}

// Helper for async testing
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper for testing error scenarios
export function expectToThrow(fn: () => any, errorMessage?: string) {
  try {
    fn()
    throw new Error('Expected function to throw but it did not')
  } catch (error) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(`Expected error message to contain "${errorMessage}" but got "${error.message}"`)
    }
  }
}

// Helper for testing async error scenarios
export async function expectToThrowAsync(fn: () => Promise<any>, errorMessage?: string) {
  try {
    await fn()
    throw new Error('Expected function to throw but it did not')
  } catch (error) {
    if (errorMessage && !error.message.includes(errorMessage)) {
      throw new Error(`Expected error message to contain "${errorMessage}" but got "${error.message}"`)
    }
  }
}