import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../lib/trpc/root';
import { createContext } from '../../../../lib/trpc/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: ({ req }) => createContext({ req: req as any }),
  });

export { handler as GET, handler as POST };