import jwt from 'jsonwebtoken';

// Authentication test utilities
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export function createTestJWT(user: TestUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' },
  );
}

export function createAuthHeaders(user: TestUser): Record<string, string> {
  const token = createTestJWT(user);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function mockNextAuthSession(user: TestUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Mock authentication for tests
export function mockAuthentication() {
  // Mock NextAuth
  jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({
      data: null,
      status: 'unauthenticated',
    })),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }));

  // Mock getServerSession
  jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
  }));
}

export function mockAuthenticatedUser(user: TestUser) {
  const { useSession } = require('next-auth/react');
  const { getServerSession } = require('next-auth');

  useSession.mockReturnValue({
    data: mockNextAuthSession(user),
    status: 'authenticated',
  });

  getServerSession.mockResolvedValue(mockNextAuthSession(user));
}

export function mockUnauthenticatedUser() {
  const { useSession } = require('next-auth/react');
  const { getServerSession } = require('next-auth');

  useSession.mockReturnValue({
    data: null,
    status: 'unauthenticated',
  });

  getServerSession.mockResolvedValue(null);
}
