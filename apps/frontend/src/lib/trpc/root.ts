import { router } from './trpc';
import { authRouter } from './routers/auth';
import { eventsRouter } from './routers/events';
import { adminRouter } from './routers/admin';

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  admin: adminRouter
});

export type AppRouter = typeof appRouter;