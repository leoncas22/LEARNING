import prisma from '../config/db.js';

/**
 * Total lesson count for a course. Used as the denominator for course
 * progress: completedLessons / totalLessons * 100.
 */
export async function getTotalLessonsForCourse(courseId, client = prisma) {
  return client.lesson.count({ where: { module: { courseId } } });
}

/**
 * Completed-lesson count for ONE user in ONE course.
 */
export async function getCompletedLessonCount(courseId, userId, client = prisma) {
  return client.lessonProgress.count({
    where: { userId, completed: true, lesson: { module: { courseId } } },
  });
}

/**
 * Completed-lesson counts for MANY users in ONE course, in a single query
 * (groupBy) — used by course-detail learner lists and HR training
 * monitoring so listing N learners never issues N queries.
 */
export async function getCompletedLessonCountsBulk(courseId, userIds, client = prisma) {
  if (userIds.length === 0) return new Map();
  const rows = await client.lessonProgress.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, completed: true, lesson: { module: { courseId } } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}

export function toPercentage(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function deriveEnrollmentStatus(percentage, currentStatus) {
  if (currentStatus === 'CANCELLED') return 'CANCELLED';
  if (percentage >= 100) return 'COMPLETED';
  if (percentage > 0) return 'IN_PROGRESS';
  return 'ASSIGNED';
}

export function isOverdue(enrollment) {
  return Boolean(
    enrollment.dueDate &&
      enrollment.status !== 'COMPLETED' &&
      enrollment.status !== 'CANCELLED' &&
      new Date(enrollment.dueDate) < new Date()
  );
}

/**
 * Recomputes one user's progress on one course and updates their
 * Enrollment (status + completedAt) to match. Called after every lesson
 * completion. Runs inside the caller's transaction when one is passed.
 */
export async function recalculateEnrollmentProgress(courseId, userId, client = prisma) {
  const [total, completed] = await Promise.all([
    getTotalLessonsForCourse(courseId, client),
    getCompletedLessonCount(courseId, userId, client),
  ]);
  const percentage = toPercentage(completed, total);

  const enrollment = await client.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) return null;

  const nextStatus = deriveEnrollmentStatus(percentage, enrollment.status);
  const wasCompleted = enrollment.status === 'COMPLETED';
  const nowCompleted = nextStatus === 'COMPLETED';

  const updated = await client.enrollment.update({
    where: { id: enrollment.id },
    data: {
      status: nextStatus,
      completedAt: nowCompleted && !wasCompleted ? new Date() : enrollment.completedAt,
    },
  });

  return { enrollment: updated, percentage, completedLessons: completed, totalLessons: total, justCompleted: nowCompleted && !wasCompleted };
}

export default {
  getTotalLessonsForCourse,
  getCompletedLessonCount,
  getCompletedLessonCountsBulk,
  toPercentage,
  deriveEnrollmentStatus,
  isOverdue,
  recalculateEnrollmentProgress,
};
