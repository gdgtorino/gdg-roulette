import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { router, protectedProcedure } from '../server';
import { redisService } from '../../redis';
import { hashPassword } from '../../utils/auth';
import type { Admin } from '../../types';

const CreateAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const adminRouter = router({
  // Get all admins
  getAll: protectedProcedure
    .query(async () => {
      const admins = await redisService.getAllAdmins();
      // Return admins without passwords
      return admins.map(admin => ({
        id: admin.id,
        username: admin.username,
        createdAt: admin.createdAt
      }));
    }),

  // Create new admin
  create: protectedProcedure
    .input(CreateAdminSchema)
    .mutation(async ({ input }) => {
      const { username, password } = input;

      // Check if admin already exists
      const existingAdmin = await redisService.getAdmin(username);
      if (existingAdmin) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Admin already exists'
        });
      }

      // Hash password and create admin
      const hashedPassword = await hashPassword(password);
      const admin: Admin = {
        id: uuidv4(),
        username,
        password: hashedPassword,
        createdAt: new Date()
      };

      await redisService.createAdmin(admin);

      // Return admin without password
      return {
        id: admin.id,
        username: admin.username,
        createdAt: admin.createdAt
      };
    }),

  // Delete admin
  delete: protectedProcedure
    .input(z.object({
      username: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      const { username } = input;

      // Prevent self-deletion
      if (username === ctx.admin.username) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete yourself'
        });
      }

      const admin = await redisService.getAdmin(username);
      if (!admin) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Admin not found'
        });
      }

      await redisService.deleteAdmin(username);
      return { message: 'Admin deleted successfully' };
    })
});