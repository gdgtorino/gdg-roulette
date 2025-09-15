import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.admin) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      admin: ctx.admin, // Type-safe admin context
    },
  });
});

// Middleware for admin ownership validation
export const adminOwnershipMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.admin) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // This middleware will be used by procedures that need admin ownership validation
  return next({
    ctx: {
      ...ctx,
      admin: ctx.admin,
    },
  });
});

export const adminProcedure = publicProcedure.use(adminOwnershipMiddleware);