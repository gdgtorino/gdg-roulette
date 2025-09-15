# Testing Infrastructure Setup

This document outlines the comprehensive testing infrastructure for The Draw
Event Management System with Lottery functionality.

## Overview

The testing infrastructure includes:

- **Jest** with React Testing Library for component unit tests
- **Playwright** for cross-browser E2E testing
- **Vitest** for database integration tests
- **MSW** (Mock Service Worker) for API mocking
- **80% minimum code coverage** requirement

## Test Structure

```
the_draw/
├── __tests__/           # Shared test utilities
│   └── utils/          # Test helpers and factories
├── e2e/                # Playwright E2E tests
├── database/           # Database testing utilities
├── jest.config.js      # Jest configuration (root)
├── jest.setup.js       # Jest global setup
├── playwright.config.ts # Playwright configuration
├── vitest.config.ts    # Vitest configuration
└── vitest.setup.ts     # Vitest global setup
```

## Environment Variables

### Test Environment (.env.test)

```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_the_draw
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_the_draw
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-for-testing-only
NEXTAUTH_SECRET=test-nextauth-secret-for-testing-only
NEXTAUTH_URL=http://localhost:3000
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Available Test Scripts

### Root Package Scripts

```bash
yarn test              # Run unit + integration tests
yarn test:unit         # Run Jest unit tests
yarn test:integration  # Run Vitest integration tests
yarn test:e2e          # Run Playwright E2E tests
yarn test:watch        # Run Jest in watch mode
yarn test:coverage     # Run tests with coverage report
yarn test:ci           # CI/CD optimized test suite
yarn test:db           # Database-specific tests
yarn test:setup        # Setup test database
```

### Workspace Scripts

```bash
# Frontend tests
yarn workspace @the-draw/frontend test
yarn workspace @the-draw/frontend test:watch
yarn workspace @the-draw/frontend test:coverage

# Backend tests
yarn workspace @the-draw/backend test
yarn workspace @the-draw/backend test:watch
yarn workspace @the-draw/backend test:coverage
```

## Test Utilities

### Custom Render (`__tests__/utils/render.tsx`)

- Wraps components with QueryClientProvider
- Custom render for Server Components
- Re-exports all testing-library utilities

### Database Helpers (`__tests__/utils/database.ts`)

- Test Prisma client setup
- Database cleanup functions
- Factory functions for test data creation

### Authentication Helpers (`__tests__/utils/auth.ts`)

- JWT token creation for tests
- NextAuth session mocking
- Authentication header helpers

### MSW Setup (`__tests__/utils/msw.ts`)

- API endpoint mocking
- Request/response handlers
- Server setup and teardown

### Test Factories (`__tests__/utils/factories.ts`)

- Mock data generators for all entities
- Complex scenario factories
- Consistent test data patterns

## Database Testing

### Setup

1. Create test database: `test_the_draw`
2. Run migrations: `yarn workspace @the-draw/backend prisma migrate deploy`
3. Seed test data as needed

### Best Practices

- Use transactions for test isolation
- Clean up after each test
- Use factories for consistent test data
- Test both success and error scenarios

## E2E Testing with Playwright

### Browser Support

- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

### Features

- Cross-browser testing
- Mobile viewport testing
- Screenshot on failure
- Video recording on failure
- Trace collection on retry

## Coverage Requirements

Minimum 80% coverage required for:

- Branches
- Functions
- Lines
- Statements

### Coverage Reports

- Text output to console
- HTML report in `coverage/` directory
- LCOV format for CI/CD integration
- JUnit XML for test reporting

## CI/CD Integration

### Test Pipeline

1. **Unit Tests**: Jest with coverage reporting
2. **Integration Tests**: Vitest for database operations
3. **E2E Tests**: Playwright across multiple browsers
4. **Coverage Check**: Enforce 80% minimum threshold

### Test Artifacts

- Coverage reports
- Test results (JUnit XML)
- E2E test videos/screenshots
- Playwright HTML reports

## Development Workflow

### TDD Workflow

1. Write failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Repeat

### Test Organization

- **Unit tests**: Single component/function testing
- **Integration tests**: Database operations, API endpoints
- **E2E tests**: Complete user workflows

### Mocking Strategy

- Mock external APIs with MSW
- Mock database for unit tests
- Use real database for integration tests
- Mock authentication for component tests

## Quick Start

1. **Install dependencies**: `yarn install`
2. **Setup test database**: `yarn test:setup`
3. **Run all tests**: `yarn test`
4. **Watch mode**: `yarn test:watch`
5. **E2E tests**: `yarn test:e2e`

## Troubleshooting

### Common Issues

- **Database connection**: Ensure PostgreSQL is running
- **Redis connection**: Ensure Redis is running
- **Port conflicts**: Check ports 3000/3001 are available
- **Browser issues**: Run `npx playwright install`

### Debug Mode

- Jest: `yarn test --verbose`
- Playwright: `yarn test:e2e --debug`
- Database: Check logs in `test-results/`
