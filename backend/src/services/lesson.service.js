import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { logActivity } from '../utils/activityLog.js';
import { sanitizeLessonContent } from '../utils/sanitizeHtml.js';
import { loadModuleForWrite } from './module.service.js';
import { recalculateEnrollmentProgress } from './progress.service.js';
import { recalculateEmployeeCompetenciesForCourse } from './employeeCompetency.service.js';
import { checkAndIssueCourseCertificates } from './certificateIssuance.service.js';

async function loadLessonForWrite(actingUser, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError('Lesson not found', 404, 'NOT_FOUND');
  assertSameCompany(lesson.module.course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && lesson.module.course.instructorId !== actingUser.id) {
    throw new AppError('Lesson not found', 404, 'NOT_FOUND');
  }
  return lesson;
}

function sanitizeLessonFields(input) {
  const data = { ...input };
  if (data.content !== undefined) {
    data.content = sanitizeLessonContent(data.content);
  }
  return data;
}

export async function createLesson(actingUser, moduleId, input) {
  const module_ = await loadModuleForWrite(actingUser, moduleId);
  const data = sanitizeLessonFields(input);

  const maxOrder = await prisma.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      content: data.type === 'TEXT' ? data.content : null,
      videoUrl: data.type === 'VIDEO' ? data.videoUrl : null,
      fileUrl: data.type === 'PDF' || data.type === 'DOCUMENT' || data.type === 'LINK' ? data.fileUrl : null,
      duration: data.duration ?? null,
      order: nextOrder,
    },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'LESSON_CREATED',
    entity: 'LESSON',
    entityId: lesson.id,
    metadata: { moduleId: module_.id, title: lesson.title, type: lesson.type },
  });

  return lesson;
}

export async function getLessonById(actingUser, lessonId) {
  const lesson = await loadLessonForWrite(actingUser, lessonId);
  return lesson;
}

/**
 * The spec lists a single `GET /api/lessons/:id`, used both by staff
 * editing content and by employees consuming it — so access is branched
 * by role here rather than splitting into two routes. Staff go through the
 * same company/instructor check as every other write endpoint; an
 * EMPLOYEE must hold an active (non-cancelled) enrollment in the lesson's
 * course — never trusted from courseId/lessonId in the URL alone.
 */
export async function getLessonForViewing(actingUser, lessonId) {
  if (actingUser.role === 'COMPANY_ADMIN' || actingUser.role === 'INSTRUCTOR' || actingUser.role === 'SUPER_ADMIN') {
    return loadLessonForWrite(actingUser, lessonId);
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || lesson.module.course.companyId !== actingUser.companyId) {
    throw new AppError('Lesson not found', 404, 'NOT_FOUND');
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: actingUser.id, courseId: lesson.module.course.id } },
  });
  if (!enrollment || enrollment.status === 'CANCELLED') {
    throw new AppError('You do not have access to this lesson', 403, 'FORBIDDEN');
  }

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: actingUser.id, lessonId } },
  });

  return { ...lesson, myProgress: progress ? { completed: progress.completed, completedAt: progress.completedAt } : null };
}

export async function updateLesson(actingUser, lessonId, input) {
  const lesson = await loadLessonForWrite(actingUser, lessonId);
  const data = sanitizeLessonFields(input);
  const type = data.type ?? lesson.type;

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: data.title ?? lesson.title,
      description: data.description ?? lesson.description,
      type,
      content: type === 'TEXT' ? data.content ?? lesson.content : null,
      videoUrl: type === 'VIDEO' ? data.videoUrl ?? lesson.videoUrl : null,
      fileUrl: type === 'PDF' || type === 'DOCUMENT' || type === 'LINK' ? data.fileUrl ?? lesson.fileUrl : null,
      duration: data.duration ?? lesson.duration,
    },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'LESSON_UPDATED',
    entity: 'LESSON',
    entityId: lessonId,
  });

  return updated;
}

export async function deleteLesson(actingUser, lessonId) {
  const lesson = await loadLessonForWrite(actingUser, lessonId);

  // Lesson -> LessonProgress is Restrict (schema.prisma): this throws a
  // clear FK error, surfaced as 409/500 by the generic error handler, if
  // any learner already has progress on this lesson — deleting graded
  // history is never silent. Unpublish/archive the course instead.
  await prisma.lesson.delete({ where: { id: lessonId } });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'LESSON_DELETED',
    entity: 'LESSON',
    entityId: lessonId,
    metadata: { moduleId: lesson.moduleId },
  });
}

export async function reorderLessons(actingUser, moduleId, orderedIds) {
  await loadModuleForWrite(actingUser, moduleId);

  const existing = await prisma.lesson.findMany({ where: { moduleId }, select: { id: true } });
  const existingIds = new Set(existing.map((l) => l.id));
  if (orderedIds.length !== existing.length || !orderedIds.every((id) => existingIds.has(id))) {
    throw new AppError("Lesson order list must contain exactly this module's lessons", 422, 'VALIDATION_ERROR');
  }

  await prisma.$transaction([
    ...orderedIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: 1000 + index } })),
    ...orderedIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index + 1 } })),
  ]);

  return prisma.lesson.findMany({ where: { moduleId }, orderBy: { order: 'asc' } });
}

/**
 * POST /api/lessons/:id/complete — the one lesson-content endpoint an
 * EMPLOYEE (not HR/Instructor) calls. Access is verified via enrollment,
 * not company role, per spec Module 14/15:
 *   authenticated -> enrollment exists -> enrollment.userId === caller ->
 *   course belongs to caller's company.
 * courseId/lessonId are never trusted beyond "does this lesson exist and
 * is this user enrolled in its course" — there is no company-admin bypass
 * here, this is the learner's own access path.
 */
export async function completeLesson(actingUser, lessonId) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) throw new AppError('Lesson not found', 404, 'NOT_FOUND');

  const course = lesson.module.course;
  if (course.companyId !== actingUser.companyId) {
    throw new AppError('Lesson not found', 404, 'NOT_FOUND');
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: actingUser.id, courseId: course.id } },
  });
  if (!enrollment || enrollment.status === 'CANCELLED') {
    throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN');
  }

  const now = new Date();
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: actingUser.id, lessonId } },
    update: { completed: true, progressPercentage: 100, completedAt: now },
    create: {
      userId: actingUser.id,
      lessonId,
      completed: true,
      progressPercentage: 100,
      startedAt: now,
      completedAt: now,
    },
  });

  const result = await recalculateEnrollmentProgress(course.id, actingUser.id);

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'LESSON_COMPLETED',
    entity: 'LESSON',
    entityId: lessonId,
    metadata: { courseId: course.id },
  });

  if (result?.justCompleted) {
    await logActivity(prisma, {
      userId: actingUser.id,
      companyId: actingUser.companyId,
      action: 'COURSE_COMPLETED',
      entity: 'COURSE',
      entityId: course.id,
    });

    // Phase 6 — Automatic Competency calculation & Certificate issuance
    try {
      await recalculateEmployeeCompetenciesForCourse(actingUser.id, course.id);
      await checkAndIssueCourseCertificates(actingUser.id, course.id);
    } catch (hookErr) {
      console.error('[PHASE6_HOOK_ERROR] Failed during course completion hook:', hookErr);
    }
  }

  return {
    lessonId,
    completed: true,
    courseProgress: result?.percentage ?? 0,
    completedLessons: result?.completedLessons ?? 0,
    totalLessons: result?.totalLessons ?? 0,
    enrollmentStatus: result?.enrollment.status,
    courseCompleted: Boolean(result?.justCompleted),
  };
}

export default { createLesson, getLessonById, getLessonForViewing, updateLesson, deleteLesson, reorderLessons, completeLesson };
