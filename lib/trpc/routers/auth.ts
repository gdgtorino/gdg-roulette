import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../server';
import { redisService } from '../../redis';
import { comparePassword, generateToken } from '../../utils/auth';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const authRouter = router({
  login: publicProcedure.input(LoginSchema).mutation(async ({ input }) => {
    const { username, password } = input;

    const admin = await redisService.getAdmin(username);
    if (!admin) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
    }

    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      });
    }

    const token = generateToken({
      adminId: admin.id,
      username: admin.username,
    });

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    };
  }),
});
