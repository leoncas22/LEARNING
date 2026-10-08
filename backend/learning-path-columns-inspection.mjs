import prisma from './src/config/db.js';
const rows = await prisma.$queryRawUnsafe("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('learning_paths','learning_path_courses','learning_path_assignments') ORDER BY table_name, ordinal_position");
console.log(rows);
await prisma.$disconnect();
