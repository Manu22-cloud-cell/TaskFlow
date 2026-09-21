import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
// The Prisma generator outputs TypeScript under src/. Nest compiles that
// client to dist/, which is the JavaScript location used by this Node script.
import { PrismaClient } from '../dist/generated/prisma/client.js';

const email = process.env.INITIAL_ADMIN_EMAIL;
const password = process.env.INITIAL_ADMIN_PASSWORD;
const name = process.env.INITIAL_ADMIN_NAME ?? 'TaskFlow Admin';

if (!email || !password) {
  throw new Error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD before running this script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: { name, email, password: passwordHash, role: 'ADMIN' },
  });

  console.log(`Admin account is ready: ${email}`);
} finally {
  await prisma.$disconnect();
}
