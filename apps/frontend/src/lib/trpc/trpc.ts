import { initTRPC, TRPCError } from '@trpc/server';
import { type NextRequest } from 'next/server';
import { validateAuth } from '@/lib/auth-middleware';
import type { JWTPayload } from '@/lib/types';

// Context creation for tRPC
export const createTRPCContext = (req: NextRequest) => {
  const admin = validateAuth(req);

  return {
    req,
    admin
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.admin) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Access token required'
    });
  }

  return next({
    ctx: {
      ...ctx,
      admin: ctx.admin as JWTPayload
    }
  });
});