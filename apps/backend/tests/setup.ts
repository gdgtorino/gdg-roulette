import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('@prisma/client');
jest.mock('redis');
jest.mock('socket.io');

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});