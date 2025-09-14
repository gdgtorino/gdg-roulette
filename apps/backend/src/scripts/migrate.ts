#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { migrationManager } from '../lib/db-utils.js';
import { connectDatabase, disconnectDatabase } from '../lib/database.js';

const prisma = new PrismaClient();

interface MigrationOptions {
  reset?: boolean;
  seed?: boolean;
  validate?: boolean;
  stats?: boolean;
}

async function runMigration(options: MigrationOptions = {}) {
  try {
    console.log('🚀 Starting database migration...');

    // Connect to database
    await connectDatabase();

    if (options.validate) {
      console.log('🔍 Validating database schema...');
      const isValid = await migrationManager.validateSchema();
      if (isValid) {
        console.log('✅ Database schema is valid');
      } else {
        console.log('❌ Database schema validation failed');
        process.exit(1);
      }
    }

    if (options.reset) {
      console.log('🗑️ Resetting database...');
      await migrationManager.resetDatabase();
      console.log('✅ Database reset completed');
    }

    if (options.seed) {
      console.log('🌱 Running database seed...');
      // Import and run seed script
      const { execSync } = require('child_process');
      execSync('tsx prisma/seed.ts', { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Database seeded successfully');
    }

    if (options.stats) {
      console.log('📊 Database statistics:');
      const stats = await migrationManager.getStatistics();
      console.table(stats);
    }

    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: MigrationOptions = {};

args.forEach(arg => {
  switch (arg) {
    case '--reset':
      options.reset = true;
      break;
    case '--seed':
      options.seed = true;
      break;
    case '--validate':
      options.validate = true;
      break;
    case '--stats':
      options.stats = true;
      break;
    case '--help':
      console.log(`
Database Migration Utility

Usage: tsx migrate.ts [options]

Options:
  --reset     Reset the database (delete all data)
  --seed      Run database seeding
  --validate  Validate database schema
  --stats     Show database statistics
  --help      Show this help message

Examples:
  tsx migrate.ts --validate --stats
  tsx migrate.ts --reset --seed
  tsx migrate.ts --validate --seed --stats
      `);
      process.exit(0);
    default:
      console.warn(`Unknown option: ${arg}`);
  }
});

// If no options provided, just validate and show stats
if (Object.keys(options).length === 0) {
  options.validate = true;
  options.stats = true;
}

// Run migration
runMigration(options);