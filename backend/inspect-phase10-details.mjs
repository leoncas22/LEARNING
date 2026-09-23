  import prisma from './src/config/db.js';
console.log(await prisma.$queryRawUnsafe("SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='NotificationType' ORDER BY enumsortorder"));
console.log(await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='learning_path_courses'"));
await prisma.$disconnect();
