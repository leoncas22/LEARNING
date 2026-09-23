import prisma from '../config/db.js';
import { toPercentage } from './progress.service.js';

export async function getHrDashboardStats(actingUser) {
  const companyId = actingUser.companyId;

  const [
    totalEmployees,
    activeEmployees,
    publishedCourses,
    activeTrainings,
    completedTrainings,
    enrollments,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId, deletedAt: null, role: { name: 'EMPLOYEE' } } }),
    prisma.user.count({ where: { companyId, deletedAt: null, role: { name: 'EMPLOYEE' }, status: 'ACTIVE' } }),
    prisma.course.count({ where: { companyId, status: 'PUBLISHED', deletedAt: null } }),
    prisma.enrollment.count({ where: { course: { companyId }, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
    prisma.enrollment.count({ where: { course: { companyId }, status: 'COMPLETED' } }),
    // Average progress needs completed-lesson-count per enrollment, which
    // isn't a column — computed via a lightweight groupBy rather than
    // pulling every LessonProgress row into JS.
    prisma.enrollment.findMany({
      where: { course: { companyId } },
      select: { userId: true, courseId: true },
    }),
  ]);

  let averageProgress = 0;
  if (enrollments.length > 0) {
    const byCourse = new Map();
    for (const e of enrollments) {
      if (!byCourse.has(e.courseId)) byCourse.set(e.courseId, []);
      byCourse.get(e.courseId).push(e.userId);
    }
    let progressSum = 0;
    for (const [courseId, userIds] of byCourse.entries()) {
      // eslint-disable-next-line no-await-in-loop
      const total = await prisma.lesson.count({ where: { module: { courseId } } });
      // eslint-disable-next-line no-await-in-loop
      const counts = await prisma.lessonProgress.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, completed: true, lesson: { module: { courseId } } },
        _count: { _all: true },
      });
      const countMap = new Map(counts.map((c) => [c.userId, c._count._all]));
      for (const userId of userIds) {
        progressSum += toPercentage(countMap.get(userId) ?? 0, total);
      }
    }
    averageProgress = Math.round(progressSum / enrollments.length);
  }

  return {
    totalEmployees,
    activeEmployees,
    publishedCourses,
    activeTrainings,
    completedTrainings,
    averageLearningProgress: averageProgress,
  };
}

export default { getHrDashboardStats };
