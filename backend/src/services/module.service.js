import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { logActivity } from '../utils/activityLog.js';

/**
 * Loads the parent course and checks both tenant AND (for instructors)
 * assignment ownership. Every module/lesson mutation goes through this
 * first — there is no path to touching course content without it.
 */
export async function loadCourseForWrite(actingUser, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt) throw new AppError('Course not found', 404, 'NOT_FOUND');
  assertSameCompany(course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  return course;
}

export async function loadModuleForWrite(actingUser, moduleId) {
  const module_ = await prisma.module.findUnique({ where: { id: moduleId }, include: { course: true } });
  if (!module_) throw new AppError('Module not found', 404, 'NOT_FOUND');
  assertSameCompany(module_.course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && module_.course.instructorId !== actingUser.id) {
    throw new AppError('Module not found', 404, 'NOT_FOUND');
  }
  return module_;
}

export async function createModule(actingUser, courseId, input) {
  const course = await loadCourseForWrite(actingUser, courseId);

  const maxOrder = await prisma.module.aggregate({ where: { courseId }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const module_ = await prisma.module.create({
    data: { courseId, title: input.title, description: input.description ?? null, order: nextOrder },
    include: { lessons: true },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'MODULE_CREATED',
    entity: 'MODULE',
    entityId: module_.id,
    metadata: { courseId: course.id, title: module_.title },
  });

  return module_;
}

export async function updateModule(actingUser, moduleId, input) {
  const module_ = await loadModuleForWrite(actingUser, moduleId);

  const updated = await prisma.module.update({
    where: { id: moduleId },
    data: { title: input.title ?? module_.title, description: input.description ?? module_.description },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'MODULE_UPDATED',
    entity: 'MODULE',
    entityId: moduleId,
  });

  return updated;
}

export async function deleteModule(actingUser, moduleId) {
  const module_ = await loadModuleForWrite(actingUser, moduleId);

  // Cascade to lessons is defined at the DB level (Module -> Lesson is
  // Cascade — see schema.prisma). If any of those lessons already have
  // learner progress, Lesson's Restrict on LessonProgress blocks the
  // delete entirely rather than silently destroying history — the course
  // should be archived instead once learners have started.
  await prisma.module.delete({ where: { id: moduleId } });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'MODULE_DELETED',
    entity: 'MODULE',
    entityId: moduleId,
    metadata: { courseId: module_.courseId },
  });
}

/**
 * Reorders every module of a course in one transaction. `orderedIds` is
 * the full new sequence — module at index 0 becomes order=1, etc. Rejects
 * if any id doesn't belong to this course (prevents cross-course tampering
 * via a crafted id list).
 */
export async function reorderModules(actingUser, courseId, orderedIds) {
  await loadCourseForWrite(actingUser, courseId);

  const existing = await prisma.module.findMany({ where: { courseId }, select: { id: true } });
  const existingIds = new Set(existing.map((m) => m.id));
  if (orderedIds.length !== existing.length || !orderedIds.every((id) => existingIds.has(id))) {
    throw new AppError("Module order list must contain exactly this course's modules", 422, 'VALIDATION_ERROR');
  }

  // Two-pass update avoids transiently violating the @@unique([courseId, order])
  // constraint while the new order is being written (offset into a safe
  // range first, then assign final values).
  await prisma.$transaction([
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: 1000 + index } })),
    ...orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index + 1 } })),
  ]);

  return prisma.module.findMany({ where: { courseId }, orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } });
}

export default { createModule, updateModule, deleteModule, reorderModules, loadCourseForWrite, loadModuleForWrite };
