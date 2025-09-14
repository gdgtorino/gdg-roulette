import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './auth';
import { databaseService } from './database';
import type { Admin } from './types';

export async function createDefaultAdmin(): Promise<void> {
  const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  try {
    // Check if default admin already exists
    const existingAdmin = await databaseService.getAdmin(defaultUsername);
    if (existingAdmin) {
      console.log('Default admin already exists');
      return;
    }

    // Create default admin
    const hashedPassword = await hashPassword(defaultPassword);
    const defaultAdmin: Admin = {
      id: uuidv4(),
      username: defaultUsername,
      password: hashedPassword,
      createdAt: new Date()
    };

    await databaseService.createAdmin(defaultAdmin);
    console.log(`Default admin created with username: ${defaultUsername}`);
  } catch (error) {
    console.error('Failed to create default admin:', error);
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    await createDefaultAdmin();
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}