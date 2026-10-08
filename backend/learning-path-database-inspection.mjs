import prisma from './src/config/db.js';
const types = await prisma.$queryRawUnsafe("SELECT typname FROM pg_type WHERE typname IN ('LearningPathStatus','NotificationType')");
const tables = await prisma.$queryRawUnsafe("SELECT tablename FROM pg_tables WHERE tablename IN ('learning_paths','learning_path_courses','learning_path_assignments')");
console.log(JSON.stringify({ types, tables }, null, 2));
await prisma.$disconnect();
