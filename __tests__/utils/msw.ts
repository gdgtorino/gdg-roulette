import { setupServer } from 'msw/node';
import { rest } from 'msw';

// MSW server setup for API mocking
export const apiHandlers = [
  // Auth endpoints
  rest.post('/api/auth/signin', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
        token: 'mock-jwt-token',
      }),
    );
  }),

  rest.post('/api/auth/signout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Event endpoints
  rest.get('/api/events', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          title: 'Test Event',
          description: 'A test event',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          maxParticipants: 100,
          isActive: true,
        },
      ]),
    );
  }),

  rest.post('/api/events', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        title: 'New Test Event',
        description: 'A new test event',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        maxParticipants: 100,
        isActive: true,
      }),
    );
  }),

  // Lottery endpoints
  rest.get('/api/lotteries', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          eventId: '1',
          name: 'Test Lottery',
          description: 'A test lottery',
          totalTickets: 100,
          ticketPrice: 10.0,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
        },
      ]),
    );
  }),

  rest.post('/api/lotteries/:id/entries', (req, res, ctx) => {
    const lotteryId = req.params.id;
    return res(
      ctx.status(201),
      ctx.json({
        id: '1',
        lotteryId,
        userId: '1',
        ticketNumber: Math.floor(Math.random() * 1000000).toString(),
        createdAt: new Date().toISOString(),
      }),
    );
  }),

  // Admin endpoints
  rest.get('/api/admin/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          createdAt: new Date().toISOString(),
        },
      ]),
    );
  }),

  // Error handlers
  rest.get('/api/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),
];

// Create and configure the MSW server
export const server = setupServer(...apiHandlers);

// Helper functions for test setup
export function setupMSW() {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'error',
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });
}

// Helper to add custom handlers for specific tests
export function addMockHandler(handler: any) {
  server.use(handler);
}

// Helper to reset all handlers
export function resetMockHandlers() {
  server.resetHandlers();
}
