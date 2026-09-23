import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../utils/activityLog.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { getCompletedLessonCountsBulk, toPercentage, isOverdue } from './progress.service.js';

/**
 * HR training-assignment workflow. Every trust boundary called out in the
 * spec is enforced here, in this order, inside one transaction:
 *   1. course belongs to actingUser.companyId (never a client-supplied id)
 *   2. course.status === PUBLISHED
 *   3. every employeeId belongs to actingUser.companyId AND status ACTIVE
 *      — if even one doesn't, the WHOLE request is rejected (no partial
 *      cross-tenant assignment ever gets committed)
 *   4. duplicate (existing) enrollments are skipped, not re-created —
 *      reported back separately from newly-created ones
 */
export async function assignTraining(actingUser, { courseId, employeeIds, dueDate }) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt || course.companyId !== actingUser.companyId) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  if (course.status !== 'PUBLISHED') {
    throw new AppError('Only published courses can be assigned as training', 422, 'COURSE_NOT_PUBLISHED');
  }

  const uniqueEmployeeIds = [...new Set(employeeIds)];
  const employees = await prisma.user.findMany({
    where: { id: { in: uniqueEmployeeIds } },
    select: { id: true, companyId: true, status: true, name: true },
  });

  if (employees.length !== uniqueEmployeeIds.length) {
    throw new AppError('One or more selected employees were not found', 404, 'NOT_FOUND');
  }
  const foreignTenant = employees.find((e) => e.companyId !== actingUser.companyId);
  if (foreignTenant) {
    // Deliberately generic — never confirm which id belongs to another
    // tenant; that would itself leak cross-tenant information.
    throw new AppError('One or more selected employees are invalid', 403, 'FORBIDDEN');
  }
  const inactiveEmployee = employees.find((e) => e.status !== 'ACTIVE');
  if (inactiveEmployee) {
    throw new AppError(`${inactiveEmployee.name} is not an active employee`, 422, 'VALIDATION_ERROR');
  }

  const existingEnrollments = await prisma.enrollment.findMany({
    where: { courseId, userId: { in: uniqueEmployeeIds } },
    select: { userId: true },
  });
  const alreadyEnrolledIds = new Set(existingEnrollments.map((e) => e.userId));
  const toEnrollIds = uniqueEmployeeIds.filter((id) => !alreadyEnrolledIds.has(id));

  const created = await prisma.$transaction(async (tx) => {
    const createdEnrollments = [];
    for (const employeeId of toEnrollIds) {
      // eslint-disable-next-line no-await-in-loop
      const enrollment = await tx.enrollment.create({
        data: {
          userId: employeeId,
          courseId,
          assignedById: actingUser.id,
          dueDate: dueDate ?? null,
          status: 'ASSIGNED',
        },
      });
      createdEnrollments.push(enrollment);

      // eslint-disable-next-line no-await-in-loop
      await tx.notification.create({
        data: {
          userId: employeeId,
          title: 'New training assigned',
          message: `You have been assigned "${course.title}".${dueDate ? ` Due: ${new Date(dueDate).toLocaleDateString()}.` : ''}`,
          type: 'TRAINING_ASSIGNED',
        },
      });

      // eslint-disable-next-line no-await-in-loop
      await logActivity(tx, {
        userId: actingUser.id,
        companyId: actingUser.companyId,
        action: 'TRAINING_ASSIGNED',
        entity: 'ENROLLMENT',
        entityId: enrollment.id,
        metadata: { courseId, employeeId, dueDate: dueDate ?? null },
      });
    }
    return createdEnrollments;
  });

  return {
    assigned: created.length,
    alreadyAssigned: alreadyEnrolledIds.size,
    totalRequested: uniqueEmployeeIds.length,
    enrollments: created,
  };
}

export async function listTrainings(actingUser, query) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['enrolledAt', 'dueDate', 'createdAt'],
    defaultSort: 'enrolledAt',
  });

  const where = { course: { companyId: actingUser.companyId } };
  if (query.courseId) where.courseId = query.courseId;
  if (query.departmentId) where.user = { departmentId: query.departmentId };
  if (query.status && query.status !== 'OVERDUE') where.status = query.status;
  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { course: { title: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort]: order },
      include: {
        course: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  // Bulk progress lookup, grouped by course to keep it to one query per
  // distinct course on this page rather than one per row.
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const progressByCourseAndUser = new Map();
  for (const cid of courseIds) {
    const userIds = enrollments.filter((e) => e.courseId === cid).map((e) => e.userId);
    // eslint-disable-next-line no-await-in-loop
    const counts = await getCompletedLessonCountsBulk(cid, userIds);
    // eslint-disable-next-line no-await-in-loop
    const total_ = await prisma.lesson.count({ where: { module: { courseId: cid } } });
    for (const [userId, completed] of counts.entries()) {
      progressByCourseAndUser.set(`${cid}:${userId}`, toPercentage(completed, total_));
    }
    progressByCourseAndUser.set(`__total__${cid}`, total_);
  }

  let rows = enrollments.map((e) => ({
    id: e.id,
    course: e.course,
    employee: e.user,
    department: e.user.department,
    assignedAt: e.enrolledAt,
    dueDate: e.dueDate,
    status: e.status,
    progress: progressByCourseAndUser.get(`${e.courseId}:${e.userId}`) ?? 0,
    overdue: isOverdue(e),
  }));

  if (query.status === 'OVERDUE') {
    rows = rows.filter((r) => r.overdue);
  }

  return { data: rows, pagination: buildPaginationMeta({ page, limit, total }) };
}

export async function getTrainingById(actingUser, enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: { select: { id: true, title: true, companyId: true } },
      user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
    },
  });
  if (!enrollment || enrollment.course.companyId !== actingUser.companyId) {
    throw new AppError('Training assignment not found', 404, 'NOT_FOUND');
  }
  return enrollment;
}

export default { assignTraining, listTrainings, getTrainingById };
