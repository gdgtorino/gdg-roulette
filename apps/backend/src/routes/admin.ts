import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '../services/redis';
import { hashPassword } from '../utils/auth';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import type { Admin } from '../types';

const router = Router();

const CreateAdminSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Get all admins (protected)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const admins = await redisService.getAllAdmins();
    // Return admins without passwords
    const safeAdmins = admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt
    }));
    res.json(safeAdmins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new admin (protected)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username, password } = CreateAdminSchema.parse(req.body);
    
    // Check if admin already exists
    const existingAdmin = await redisService.getAdmin(username);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
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
    res.status(201).json({
      id: admin.id,
      username: admin.username,
      createdAt: admin.createdAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete admin (protected) - prevent self-deletion
router.delete('/:username', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params;
    
    // Prevent self-deletion
    if (username === req.admin!.username) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    const admin = await redisService.getAdmin(username);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    await redisService.deleteAdmin(username);
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;