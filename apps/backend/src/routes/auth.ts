import { Router } from 'express';
import { z } from 'zod';
import { redisService } from '../services/redis';
import { comparePassword, generateToken } from '../utils/auth';

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    
    const admin = await redisService.getAdmin(username);
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken({
      adminId: admin.id,
      username: admin.username
    });
    
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;