import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.winner.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.draw.deleteMany();
  await prisma.session.deleteMany();
  await prisma.cache.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin', 10);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log('👤 Created admin user:', adminUser.username);

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const operatorUser = await prisma.user.create({
    data: {
      username: 'operator',
      password: operatorPassword,
      role: UserRole.OPERATOR,
    },
  });

  console.log('👤 Created operator user:', operatorUser.username);

  // Create sample draws
  const sampleDraw1 = await prisma.draw.create({
    data: {
      name: 'Summer Raffle 2024',
      description: 'Grand summer prize raffle with amazing prizes',
      createdBy: adminUser.id,
      registrationOpen: true,
      closed: false,
      qrCode: 'QR_SUMMER_2024',
      drawDate: new Date('2024-12-25'),
      maxParticipants: 100,
      prizeDescription: 'MacBook Pro, iPad, AirPods, and more!',
    },
  });

  const sampleDraw2 = await prisma.draw.create({
    data: {
      name: 'Holiday Giveaway',
      description: 'Special holiday season giveaway',
      createdBy: operatorUser.id,
      registrationOpen: true,
      closed: false,
      qrCode: 'QR_HOLIDAY_2024',
      drawDate: new Date('2024-12-31'),
      maxParticipants: 50,
      prizeDescription: 'Gift cards and holiday packages',
    },
  });

  const completedDraw = await prisma.draw.create({
    data: {
      name: 'Spring Contest 2024',
      description: 'Completed spring contest with winners',
      createdBy: adminUser.id,
      registrationOpen: false,
      closed: true,
      qrCode: 'QR_SPRING_2024',
      drawDate: new Date('2024-04-15'),
      maxParticipants: 30,
      prizeDescription: 'Spring cleaning supplies and garden tools',
    },
  });

  console.log('🎟️ Created sample draws');

  // Create sample tickets for active draws
  const participants = [
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1234567890' },
    { name: 'Bob Smith', email: 'bob@example.com', phone: '+1234567891' },
    { name: 'Charlie Brown', email: 'charlie@example.com', phone: '+1234567892' },
    { name: 'Diana Prince', email: 'diana@example.com', phone: '+1234567893' },
    { name: 'Eve Adams', email: 'eve@example.com', phone: '+1234567894' },
    { name: 'Frank Wilson', email: 'frank@example.com', phone: '+1234567895' },
    { name: 'Grace Lee', email: 'grace@example.com', phone: '+1234567896' },
    { name: 'Henry Garcia', email: 'henry@example.com', phone: '+1234567897' },
    { name: 'Ivy Martinez', email: 'ivy@example.com', phone: '+1234567898' },
    { name: 'Jack Davis', email: 'jack@example.com', phone: '+1234567899' },
  ];

  // Add participants to summer raffle
  const summerTickets = [];
  for (let i = 0; i < 8; i++) {
    const participant = participants[i];
    const ticket = await prisma.ticket.create({
      data: {
        drawId: sampleDraw1.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        metadata: {
          source: 'web',
          referral: i % 2 === 0 ? 'social_media' : 'word_of_mouth',
        },
      },
    });
    summerTickets.push(ticket);
  }

  // Add participants to holiday giveaway
  for (let i = 0; i < 5; i++) {
    const participant = participants[i + 3];
    await prisma.ticket.create({
      data: {
        drawId: sampleDraw2.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        metadata: {
          source: 'qr_code',
          location: 'event_booth',
        },
      },
    });
  }

  // Add participants and winners to completed draw
  const completedTickets = [];
  for (let i = 0; i < 6; i++) {
    const participant = participants[i + 2];
    const ticket = await prisma.ticket.create({
      data: {
        drawId: completedDraw.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        registeredAt: new Date(2024, 2, 10 + i), // March dates
      },
    });
    completedTickets.push(ticket);
  }

  // Create winners for completed draw
  const winners = [
    { ticket: completedTickets[2], prize: '1st Prize - Garden Set', order: 1 },
    { ticket: completedTickets[0], prize: '2nd Prize - Tool Kit', order: 2 },
    { ticket: completedTickets[4], prize: '3rd Prize - Gift Card', order: 3 },
  ];

  for (const winner of winners) {
    await prisma.winner.create({
      data: {
        drawId: completedDraw.id,
        ticketId: winner.ticket.id,
        drawOrder: winner.order,
        prize: winner.prize,
        drawnAt: new Date('2024-04-15T15:30:00'),
        claimed: winner.order <= 2, // First two prizes claimed
        claimedAt: winner.order <= 2 ? new Date('2024-04-16T10:00:00') : null,
        notes: winner.order <= 2 ? 'Prize claimed successfully' : 'Awaiting claim',
      },
    });
  }

  console.log('🎫 Created sample tickets and winners');

  // Create some cache entries
  await prisma.cache.create({
    data: {
      key: 'system:stats',
      value: {
        totalDraws: 3,
        totalParticipants: 19,
        totalWinners: 3,
        lastUpdated: new Date().toISOString(),
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  await prisma.cache.create({
    data: {
      key: 'config:max_participants_default',
      value: { value: 100 },
      expiresAt: null, // No expiration
    },
  });

  console.log('💾 Created cache entries');

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Draws: ${await prisma.draw.count()}`);
  console.log(`- Tickets: ${await prisma.ticket.count()}`);
  console.log(`- Winners: ${await prisma.winner.count()}`);
  console.log(`- Cache entries: ${await prisma.cache.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });