import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '../services/redis';
import type { Admin, JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export async function createDefaultAdmin(): Promise<void> {
  const username = process.env.ADMIN_DEFAULT_USER || 'admin';
  const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin';
  
  const existingAdmin = await redisService.getAdmin(username);
  if (existingAdmin) {
    // Ensure default admin is in the admins set
    await redisService.client.sAdd('admins', username);
    return;
  }
  
  const hashedPassword = await hashPassword(password);
  const admin: Admin = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    createdAt: new Date()
  };
  
  await redisService.createAdmin(admin);
  console.log(`Default admin created: ${username}`);
}