#!/usr/bin/env node

import { initializeDatabase } from '../lib/init';

async function main() {
  console.log('Initializing database...');
  await initializeDatabase();
  console.log('Database initialization complete');
  process.exit(0);
}

main().catch((error) => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});