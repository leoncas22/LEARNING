import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { logActivity } from '../utils/activityLog.js';

async function assertCourseAccess(actingUser, courseId, requireWrite = false) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(course.companyId, actingUser);

  if (requireWrite && actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('You do not have permission to modify this course', 403, 'FORBIDDEN');
  }

  return course;
}

export async function listCourseCompetencies(actingUser, courseId) {
  await assertCourseAccess(actingUser, courseId, false);

  const mappings = await prisma.courseCompetency.findMany({
    where: { courseId },
    include: {
      competency: {
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          status: true,
          levels: {
            orderBy: { minScore: 'asc' },
          },
        },
      },
    },
    orderBy: { competency: { name: 'asc' } },
  });

  return mappings.map((m) => ({
    id: m.id,
    courseId: m.courseId,
    competencyId: m.competencyId,
    targetLevel: m.targetLevel,
    weight: m.weight,
    competency: m.competency,
  }));
}

export async function addCourseCompetency(actingUser, courseId, data) {
  const course = await assertCourseAccess(actingUser, courseId, true);

  const competency = await prisma.competency.findUnique({
    where: { id: data.competencyId },
  });

  if (!competency) {
    throw new AppError('Competency not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(competency.companyId, actingUser);

  const record = await prisma.courseCompetency.upsert({
    where: {
      courseId_competencyId: {
        courseId,
        competencyId: data.competencyId,
      },
    },
    create: {
      courseId,
      competencyId: data.competencyId,
      targetLevel: data.targetLevel,
      weight: data.weight || 1.0,
    },
    update: {
      targetLevel: data.targetLevel,
      weight: data.weight || 1.0,
    },
    include: {
      competency: true,
    },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_COMPETENCY_ASSIGNED',
    entity: 'COURSE_COMPETENCY',
    entityId: record.id,
    metadata: {
      courseId,
      courseTitle: course.title,
      competencyId: competency.id,
      competencyName: competency.name,
      targetLevel: record.targetLevel,
    },
  });

  return record;
}

export async function removeCourseCompetency(actingUser, courseId, competencyId) {
  const course = await assertCourseAccess(actingUser, courseId, true);

  const existing = await prisma.courseCompetency.findUnique({
    where: {
      courseId_competencyId: {
        courseId,
        competencyId,
      },
    },
  });

  if (!existing) {
    throw new AppError('Competency is not assigned to this course', 404, 'NOT_FOUND');
  }

  await prisma.courseCompetency.delete({
    where: { id: existing.id },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_COMPETENCY_REMOVED',
    entity: 'COURSE_COMPETENCY',
    entityId: existing.id,
    metadata: { courseId, courseTitle: course.title, competencyId },
  });

  return { success: true };
}

export default {
  listCourseCompetencies,
  addCourseCompetency,
  removeCourseCompetency,
};

