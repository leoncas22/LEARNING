import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getTotalLessonsForCourse, toPercentage, isOverdue } from './progress.service.js';

export async function listMyCourses(actingUser, query) {
  const { page, limit, skip } = parsePagination(query, { defaultSort: 'enrolledAt' });

  const where = { userId: actingUser.id };
  if (query.status === 'IN_PROGRESS') where.status = 'IN_PROGRESS';
  if (query.status === 'COMPLETED') where.status = 'COMPLETED';

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            category: true,
            difficulty: true,
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const withProgress = await Promise.all(
    enrollments.map(async (e) => {
      const totalLessons = await getTotalLessonsForCourse(e.courseId);
      // completed count for THIS user only — reuse the bulk helper's shape
      // for consistency, called per-course here since "My Courses" is
      // inherently a single-user query (no N+1 across users to avoid).
      const completed = await prisma.lessonProgress.count({
        where: { userId: actingUser.id, completed: true, lesson: { module: { courseId: e.courseId } } },
      });
      return {
        enrollmentId: e.id,
        course: e.course,
        status: e.status,
        progress: toPercentage(completed, totalLessons),
        dueDate: e.dueDate,
        overdue: isOverdue(e),
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
      };
    })
  );

  return { data: withProgress, pagination: buildPaginationMeta({ page, limit, total }) };
}

/**
 * Course detail for the learner: full module/lesson tree with a
 * completed-flag per lesson, plus a `continueLessonId` pointing at the
 * first incomplete lesson (or null once the course is fully complete).
 * Access requires an active enrollment — never just company membership.
 */
export async function getMyCourseDetail(actingUser, courseId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: actingUser.id, courseId } },
  });
  if (!enrollment || enrollment.status === 'CANCELLED') {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
    },
  });
  if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND');

  const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: actingUser.id, lessonId: { in: lessonIds } },
  });
  const completedSet = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));

  const modules = course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => ({ ...l, completed: completedSet.has(l.id) })),
  }));

  const allLessons = modules.flatMap((m) => m.lessons);
  const firstIncomplete = allLessons.find((l) => !l.completed);
  const moduleProgress = modules.map((module) => ({
    moduleId: module.id,
    completedLessons: module.lessons.filter((lesson) => lesson.completed).length,
    totalLessons: module.lessons.length,
    progress: toPercentage(module.lessons.filter((lesson) => lesson.completed).length, module.lessons.length),
  }));

  return {
    course: { ...course, modules: undefined },
    modules,
    moduleProgress,
    enrollment: {
      status: enrollment.status,
      progress: toPercentage(completedSet.size, allLessons.length),
      dueDate: enrollment.dueDate,
      overdue: isOverdue(enrollment),
      completedAt: enrollment.completedAt,
    },
    continueLessonId: firstIncomplete ? firstIncomplete.id : null,
    courseCompleted: allLessons.length > 0 && !firstIncomplete,
  };
}

export async function getMyLearningSummary(actingUser) {
  const [assigned, inProgress, completed, overdueRows] = await Promise.all([
    prisma.enrollment.count({ where: { userId: actingUser.id, status: 'ASSIGNED' } }),
    prisma.enrollment.count({ where: { userId: actingUser.id, status: 'IN_PROGRESS' } }),
    prisma.enrollment.count({ where: { userId: actingUser.id, status: 'COMPLETED' } }),
    prisma.enrollment.findMany({
      where: { userId: actingUser.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] }, dueDate: { not: null } },
      select: { dueDate: true },
    }),
  ]);

  const overdueCount = overdueRows.filter((e) => new Date(e.dueDate) < new Date()).length;

  return {
    totalAssigned: assigned + inProgress + completed,
    assigned,
    inProgress,
    completed,
    overdue: overdueCount,
  };
}

export default { listMyCourses, getMyCourseDetail, getMyLearningSummary };
