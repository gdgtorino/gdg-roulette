import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { router, protectedProcedure } from '../trpc';
import { redisService } from '@/lib/redis';
import { hashPassword } from '@/lib/auth';
import type { Admin } from '@/lib/types';

const CreateAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const adminRouter = router({
  // Get all admins (protected)
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

  // Create new admin (protected)
  create: protectedProcedure
    .input(CreateAdminSchema)
    .mutation(async ({ input }) => {
      // Check if admin already exists
      const existingAdmin = await redisService.getAdmin(input.username);
      if (existingAdmin) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Admin already exists'
        });
      }

      // Hash password and create admin
      const hashedPassword = await hashPassword(input.password);
      const newAdmin: Admin = {
        id: uuidv4(),
        username: input.username,
        password: hashedPassword,
        createdAt: new Date()
      };

      await redisService.createAdmin(newAdmin);

      // Return admin without password
      return {
        id: newAdmin.id,
        username: newAdmin.username,
        createdAt: newAdmin.createdAt
      };
    }),

  // Delete admin (protected) - prevent self-deletion
  delete: protectedProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Prevent self-deletion
      if (input.username === ctx.admin.username) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete yourself'
        });
      }

      const adminToDelete = await redisService.getAdmin(input.username);
      if (!adminToDelete) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Admin not found'
        });
      }

      await redisService.deleteAdmin(input.username);
      return { success: true };
    })
});