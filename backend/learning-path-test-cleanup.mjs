import prisma from './src/config/db.js';
const id = '966aa95e-5c53-4bde-8263-f4ee2293aea0';
await prisma.learningPathAssignment.deleteMany({ where: { learningPathId: id } });
await prisma.learningPathCourse.deleteMany({ where: { learningPathId: id } });
await prisma.learningPath.delete({ where: { id } });
await prisma.$disconnect();
console.log('runtime test path cleaned');
