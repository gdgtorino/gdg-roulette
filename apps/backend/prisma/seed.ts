import { PrismaClient, AdminRole, EventState } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data in correct order due to foreign key constraints
  await prisma.winner.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.cache.deleteMany();
  await prisma.admin.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin', 10);
  const adminUser = await prisma.admin.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      permissions: [AdminRole.ADMIN],
    },
  });

  console.log('👤 Created admin user:', adminUser.username);

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const operatorUser = await prisma.admin.create({
    data: {
      username: 'operator',
      password: operatorPassword,
      permissions: [AdminRole.OPERATOR],
    },
  });

  console.log('👤 Created operator user:', operatorUser.username);

  // Create viewer user
  const viewerPassword = await bcrypt.hash('viewer123', 10);
  const viewerUser = await prisma.admin.create({
    data: {
      username: 'viewer',
      password: viewerPassword,
      permissions: [AdminRole.VIEWER],
    },
  });

  console.log('👤 Created viewer user:', viewerUser.username);

  // Create sample events in different states
  const initEvent = await prisma.event.create({
    data: {
      name: 'Summer Tech Raffle 2024',
      state: EventState.INIT,
      maxParticipants: 100,
      registrationLink: 'https://the-draw.app/register/summer-tech-2024',
      qrCode: 'QR_SUMMER_TECH_2024',
      createdBy: adminUser.id,
    },
  });

  const registrationEvent = await prisma.event.create({
    data: {
      name: 'Holiday Gaming Giveaway',
      state: EventState.REGISTRATION,
      maxParticipants: 50,
      registrationLink: 'https://the-draw.app/register/holiday-gaming-2024',
      qrCode: 'QR_HOLIDAY_GAMING_2024',
      createdBy: operatorUser.id,
    },
  });

  const drawEvent = await prisma.event.create({
    data: {
      name: 'Spring Conference Prizes',
      state: EventState.DRAW,
      maxParticipants: 30,
      registrationLink: 'https://the-draw.app/register/spring-conference-2024',
      qrCode: 'QR_SPRING_CONF_2024',
      createdBy: adminUser.id,
    },
  });

  const closedEvent = await prisma.event.create({
    data: {
      name: 'Winter Charity Raffle',
      state: EventState.CLOSED,
      maxParticipants: 75,
      registrationLink: 'https://the-draw.app/register/winter-charity-2024',
      qrCode: 'QR_WINTER_CHARITY_2024',
      createdBy: adminUser.id,
    },
  });

  console.log('🎪 Created sample events in different states');

  // Create sample participants
  const participantNames = [
    'Alice Johnson',
    'Bob Smith',
    'Charlie Brown',
    'Diana Prince',
    'Eve Adams',
    'Frank Wilson',
    'Grace Lee',
    'Henry Garcia',
    'Ivy Martinez',
    'Jack Davis',
    'Kate Miller',
    'Liam Thompson',
    'Maya Patel',
    'Noah Chen',
    'Olivia Rodriguez',
    'Paul Kim',
    'Quinn Foster',
    'Rachel Green',
    'Sam Taylor',
    'Tina Wang',
  ];

  // Add participants to registration event
  const registrationParticipants = [];
  for (let i = 0; i < 8; i++) {
    const participant = await prisma.participant.create({
      data: {
        name: participantNames[i],
        eventId: registrationEvent.id,
        userId: `user_${i + 1}`,
      },
    });
    registrationParticipants.push(participant);
  }

  // Add participants to draw event
  const drawParticipants = [];
  for (let i = 0; i < 12; i++) {
    const participant = await prisma.participant.create({
      data: {
        name: participantNames[i + 5],
        eventId: drawEvent.id,
        userId: `user_${i + 6}`,
      },
    });
    drawParticipants.push(participant);
  }

  // Add participants to closed event
  const closedParticipants = [];
  for (let i = 0; i < 15; i++) {
    const participant = await prisma.participant.create({
      data: {
        name: participantNames[i % participantNames.length],
        eventId: closedEvent.id,
        userId: `user_${i + 21}`,
        registeredAt: new Date(2024, 1, 10 + i), // February dates
      },
    });
    closedParticipants.push(participant);
  }

  console.log('🎫 Created sample participants');

  // Create winners for draw event (3 winners)
  const drawWinners = [
    { participant: drawParticipants[3], position: 1 },
    { participant: drawParticipants[7], position: 2 },
    { participant: drawParticipants[1], position: 3 },
  ];

  for (const winner of drawWinners) {
    await prisma.winner.create({
      data: {
        participantId: winner.participant.id,
        eventId: drawEvent.id,
        position: winner.position,
        drawnAt: new Date('2024-03-15T14:30:00'),
      },
    });
  }

  // Create winners for closed event (5 winners)
  const closedWinners = [
    { participant: closedParticipants[8], position: 1 },
    { participant: closedParticipants[2], position: 2 },
    { participant: closedParticipants[11], position: 3 },
    { participant: closedParticipants[5], position: 4 },
    { participant: closedParticipants[14], position: 5 },
  ];

  for (const winner of closedWinners) {
    await prisma.winner.create({
      data: {
        participantId: winner.participant.id,
        eventId: closedEvent.id,
        position: winner.position,
        drawnAt: new Date('2024-02-28T16:00:00'),
      },
    });
  }

  console.log('🏆 Created sample winners');

  // Create cache entries for system configuration
  await prisma.cache.create({
    data: {
      key: 'system:stats',
      value: {
        totalEvents: 4,
        totalParticipants: 35,
        totalWinners: 8,
        activeEvents: 2,
        lastUpdated: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  await prisma.cache.create({
    data: {
      key: 'config:default_max_participants',
      value: { value: 100 },
      expiresAt: null, // No expiration
    },
  });

  await prisma.cache.create({
    data: {
      key: 'config:registration_timeout_hours',
      value: { value: 72 },
      expiresAt: null,
    },
  });

  console.log('💾 Created cache entries');

  // Create sample sessions (for testing)
  const sessionToken1 = 'session_token_admin_test_123';
  const sessionToken2 = 'session_token_operator_test_456';

  await prisma.session.create({
    data: {
      token: sessionToken1,
      userId: adminUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await prisma.session.create({
    data: {
      token: sessionToken2,
      userId: operatorUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  console.log('🔐 Created sample sessions');

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Admins: ${await prisma.admin.count()}`);
  console.log(`- Events: ${await prisma.event.count()}`);
  console.log(`- Participants: ${await prisma.participant.count()}`);
  console.log(`- Winners: ${await prisma.winner.count()}`);
  console.log(`- Sessions: ${await prisma.session.count()}`);
  console.log(`- Cache entries: ${await prisma.cache.count()}`);

  console.log('\n🎯 Event States:');
  const eventStates = await prisma.event.groupBy({
    by: ['state'],
    _count: { state: true },
  });
  eventStates.forEach(state => {
    console.log(`- ${state.state}: ${state._count.state} events`);
  });

  console.log('\n👥 Admin Permissions:');
  const adminPerms = await prisma.admin.findMany({
    select: { username: true, permissions: true },
  });
  adminPerms.forEach(admin => {
    console.log(`- ${admin.username}: ${admin.permissions.join(', ')}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });