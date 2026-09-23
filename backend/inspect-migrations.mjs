import prisma from './src/config/db.js';
const rows = await prisma.$queryRawUnsafe("SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations WHERE migration_name LIKE '%phase_10%' ORDER BY started_at");
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
