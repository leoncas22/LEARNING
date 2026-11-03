import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const systemRoles = [
  { name: 'SUPER_ADMIN', description: 'Platform administrator role' },
  { name: 'COMPANY_ADMIN', description: 'Company administrator role' },
  { name: 'INSTRUCTOR', description: 'Instructor role' },
  { name: 'EMPLOYEE', description: 'Employee role' },
];

async function initializeSystemRoles() {
  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { description: role.description },
    });
  }
  console.log(`Initialized ${systemRoles.length} system roles.`);
}

initializeSystemRoles()
  .catch((error) => {
    console.error('Unable to initialize system roles. Confirm DATABASE_URL and migrations are configured.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
