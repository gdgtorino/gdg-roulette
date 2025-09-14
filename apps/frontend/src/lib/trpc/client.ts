import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from './root';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});