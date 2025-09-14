const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/frontend',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  preset: 'ts-jest',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/apps/frontend/$1',
    '^@backend/(.*)$': '<rootDir>/apps/backend/$1',
  },
  testMatch: [
    '<rootDir>/apps/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/apps/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.(test|spec).{js,jsx,ts,tsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/apps/frontend/.next/',
    '<rootDir>/apps/backend/dist/',
    '<rootDir>/e2e/'
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'apps/**/*.{js,jsx,ts,tsx}',
    '!apps/**/*.d.ts',
    '!apps/**/node_modules/**',
    '!apps/**/.next/**',
    '!apps/**/dist/**',
    '!apps/**/coverage/**',
    '!**/prisma/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library|@radix-ui))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>/apps/', '<rootDir>/__tests__/'],
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)