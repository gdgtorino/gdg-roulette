import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

/**
 * Creates a test Express application with basic middleware
 * This is a mock app since the actual admin system doesn't exist yet
 * These tests are designed to FAIL until the real implementation is created
 */
export function createTestApp() {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Mock routes that will fail by design (RED phase of TDD)

  // Admin Account Management (all should fail)
  app.post('/api/admin', (req, res) => {
    res.status(501).json({ error: 'Admin creation not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/:id', (req, res) => {
    res.status(501).json({ error: 'Admin retrieval not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin', (req, res) => {
    res.status(501).json({ error: 'Admin listing not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.put('/api/admin/:id', (req, res) => {
    res.status(501).json({ error: 'Admin update not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.delete('/api/admin/:id', (req, res) => {
    res.status(501).json({ error: 'Admin deletion not implemented', code: 'NOT_IMPLEMENTED' });
  });

  // Authentication (all should fail)
  app.post('/api/auth/login', (req, res) => {
    res.status(501).json({ error: 'Login not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.status(501).json({ error: 'Logout not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/auth/logout-all', (req, res) => {
    res.status(501).json({ error: 'Logout all not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/auth/verify', (req, res) => {
    res.status(501).json({ error: 'Token verification not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/auth/refresh', (req, res) => {
    res.status(501).json({ error: 'Token refresh not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/auth/cleanup-sessions', (req, res) => {
    res.status(501).json({ error: 'Session cleanup not implemented', code: 'NOT_IMPLEMENTED' });
  });

  // Password Management (all should fail)
  app.put('/api/admin/password', (req, res) => {
    res.status(501).json({ error: 'Password change not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/admin/password/reset-request', (req, res) => {
    res.status(501).json({ error: 'Password reset request not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/admin/password/reset', (req, res) => {
    res.status(501).json({ error: 'Password reset not implemented', code: 'NOT_IMPLEMENTED' });
  });

  // Dashboard Access Control (all should fail)
  app.get('/api/admin/dashboard', (req, res) => {
    res.status(501).json({ error: 'Dashboard not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/events', (req, res) => {
    res.status(501).json({ error: 'Events endpoint not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.post('/api/admin/events', (req, res) => {
    res.status(501).json({ error: 'Event creation not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.put('/api/admin/events/:id', (req, res) => {
    res.status(501).json({ error: 'Event update not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.delete('/api/admin/events/:id', (req, res) => {
    res.status(501).json({ error: 'Event deletion not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/participants', (req, res) => {
    res.status(501).json({ error: 'Participants endpoint not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/settings', (req, res) => {
    res.status(501).json({ error: 'Settings endpoint not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.put('/api/admin/settings', (req, res) => {
    res.status(501).json({ error: 'Settings update not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/settings/security', (req, res) => {
    res.status(501).json({ error: 'Security settings not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/users', (req, res) => {
    res.status(501).json({ error: 'Users endpoint not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.delete('/api/admin/users/:id', (req, res) => {
    res.status(501).json({ error: 'User deletion not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.put('/api/admin/:id/permissions', (req, res) => {
    res.status(501).json({ error: 'Permission update not implemented', code: 'NOT_IMPLEMENTED' });
  });

  app.get('/api/admin/database/raw', (req, res) => {
    res.status(501).json({ error: 'Raw database access not implemented', code: 'NOT_IMPLEMENTED' });
  });

  // Catch-all for unhandled routes
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Test app error:', err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  return app;
}