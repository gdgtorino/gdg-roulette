import { router } from './server';
import { authRouter } from './routers/auth';
import { adminRouter } from './routers/admin';
import { eventsRouter } from './routers/events';

export const appRouter = router({
  auth: authRouter,
  admin: adminRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;