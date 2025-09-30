import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // check if default admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('default admin already exists');
    return;
  }

  // hash default password
  const hashedPassword = await bcrypt.hash('password', 10);

  // create default admin
  const admin = await prisma.admin.create({
    data: {
      username: 'admin',
      password: hashedPassword,
    },
  });

  console.log('default admin created:', admin.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });