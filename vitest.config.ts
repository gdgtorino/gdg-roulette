import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'database-tests',
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/database/**/*.test.{ts,js}',
      '**/integration/**/*.test.{ts,js}',
      '**/__tests__/**/*.test.{ts,js}',
      '**/tests/**/*.test.{ts,js}',
    ],
    exclude: ['node_modules', 'dist', '.next', 'e2e', '**/frontend/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/prisma/migrations/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/database': path.resolve(__dirname, './database'),
    },
  },
});
