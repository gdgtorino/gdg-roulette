#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { isDatabaseHealthy, connectDatabase, disconnectDatabase } from '../lib/database.js';

async function testDatabaseConnection() {
  console.log('🔧 Testing database connection...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log('');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    await connectDatabase();
    console.log('   ✅ Basic connection successful');

    // Test health check
    console.log('2. Testing health check...');
    const isHealthy = await isDatabaseHealthy();
    if (isHealthy) {
      console.log('   ✅ Health check passed');
    } else {
      console.log('   ❌ Health check failed');
      return;
    }

    // Test schema access
    console.log('3. Testing schema access...');
    const prisma = new PrismaClient();

    try {
      await prisma.admin.findFirst();
      console.log('   ✅ Admin table accessible');
    } catch (error) {
      console.log('   ⚠️ Admin table not accessible (may need migration)');
    }

    try {
      await prisma.event.findFirst();
      console.log('   ✅ Event table accessible');
    } catch (error) {
      console.log('   ⚠️ Event table not accessible (may need migration)');
    }

    try {
      await prisma.participant.findFirst();
      console.log('   ✅ Participant table accessible');
    } catch (error) {
      console.log('   ⚠️ Participant table not accessible (may need migration)');
    }

    try {
      await prisma.winner.findFirst();
      console.log('   ✅ Winner table accessible');
    } catch (error) {
      console.log('   ⚠️ Winner table not accessible (may need migration)');
    }

    try {
      await prisma.session.findFirst();
      console.log('   ✅ Session table accessible');
    } catch (error) {
      console.log('   ⚠️ Session table not accessible (may need migration)');
    }

    try {
      await prisma.cache.findFirst();
      console.log('   ✅ Cache table accessible');
    } catch (error) {
      console.log('   ⚠️ Cache table not accessible (may need migration)');
    }

    // Test transactions
    console.log('4. Testing transaction support...');
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1`;
    });
    console.log('   ✅ Transaction support working');

    console.log('');
    console.log('🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run the test
testDatabaseConnection();