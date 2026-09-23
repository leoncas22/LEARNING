import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getCompletedLessonCountsBulk, toPercentage, isOverdue } from './progress.service.js';

function assertInstructor(actingUser) {
  if (actingUser.role !== 'INSTRUCTOR') throw new AppError('Instructor access required', 403, 'FORBIDDEN');
}

function courseWhere(actingUser) {
  assertInstructor(actingUser);
  return { companyId: actingUser.companyId, instructorId: actingUser.id, deletedAt: null };
}

const courseSelect = {
  id: true, title: true, status: true, category: true, difficulty: true, updatedAt: true,
  _count: { select: { enrollments: true, modules: true, quizzes: true } },
};

export async function getDashboard(actingUser) {
  const where = courseWhere(actingUser);
  const courses = await prisma.course.findMany({ where, select: courseSelect, orderBy: { updatedAt: 'desc' } });
  const courseIds = courses.map((course) => course.id);
  const enrollments = courseIds.length
    ? await prisma.enrollment.findMany({ where: { courseId: { in: courseIds } }, select: { userId: true, courseId: true, status: true, dueDate: true } })
    : [];
  const uniqueLearners = new Set(enrollments.map((row) => row.userId));
  const activeLearners = new Set(enrollments.filter((row) => ['ASSIGNED', 'IN_PROGRESS'].includes(row.status)).map((row) => row.userId));
  const completedLearners = new Set(enrollments.filter((row) => row.status === 'COMPLETED').map((row) => row.userId));
  const upcomingDeadlines = enrollments.filter((row) => row.dueDate && row.dueDate >= new Date() && row.status !== 'COMPLETED').length;
  const attempts = courseIds.length ? await prisma.quizAttempt.findMany({
    where: { quiz: { courseId: { in: courseIds } }, status: { in: ['GRADED', 'EXPIRED'] }, score: { not: null } },
    select: { score: true },
  }) : [];
  const averageQuizScore = attempts.length ? Math.round(attempts.reduce((sum, row) => sum + row.score, 0) / attempts.length) : 0;

  return {
    courses: courses.map((course) => ({ ...course, learnerCount: course._count.enrollments, moduleCount: course._count.modules, quizCount: course._count.quizzes, _count: undefined })),
    metrics: {
      assignedCourses: courses.length,
      publishedCourses: courses.filter((course) => course.status === 'PUBLISHED').length,
      draftCourses: courses.filter((course) => course.status === 'DRAFT').length,
      totalLearners: uniqueLearners.size,
      activeLearners: activeLearners.size,
      completedLearners: completedLearners.size,
      upcomingDeadlines,
      averageQuizScore,
    },
  };
}

export async function listLearners(actingUser, courseId, query) {
  const where = courseWhere(actingUser);
  const course = await prisma.course.findFirst({ where: { ...where, id: courseId }, select: { id: true, title: true } });
  if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND');
  const { page, limit, skip } = parsePagination(query, { defaultSort: 'enrolledAt' });
  const enrollmentWhere = { courseId };
  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where: enrollmentWhere }),
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      skip,
      take: limit,
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  const userIds = enrollments.map((row) => row.userId);
  const lessonFilter = { module: { courseId: courseId } };
  const totalLessons = await prisma.lesson.count({ where: lessonFilter });
  const completed = await getCompletedLessonCountsBulk(courseId, userIds);
  const rows = enrollments.map((row) => ({
    enrollmentId: row.id,
    course: { id: course.id, title: course.title },
    user: row.user,
    status: row.status,
    progress: toPercentage(completed.get(row.userId) ?? 0, totalLessons),
    dueDate: row.dueDate,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt,
    overdue: isOverdue(row),
  }));
  return { data: rows, pagination: buildPaginationMeta({ page, limit, total }) };
}

export default { getDashboard, listLearners };
