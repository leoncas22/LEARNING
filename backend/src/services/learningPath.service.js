import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../utils/activityLog.js';

const pathInclude = {
  courses: {
    orderBy: { order: 'asc' },
    include: {
      course: { select: { id: true, title: true, status: true, category: true, difficulty: true } },
    },
  },
};

function assertAdmin(user) {
  if (user.role !== 'COMPANY_ADMIN') throw new AppError('Company admin access required', 403, 'FORBIDDEN');
}

async function getOwnedPath(user, id) {
  const path = await prisma.learningPath.findFirst({ where: { id, companyId: user.companyId }, include: pathInclude });
  if (!path) throw new AppError('Learning path not found', 404, 'NOT_FOUND');
  return path;
}

function shapePath(path) {
  return { ...path, courseCount: path.courses.length, courses: path.courses.map((row) => ({ ...row.course, pathCourseId: row.id, order: row.order, required: row.required })) };
}

export async function listPaths(user, query) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const where = { companyId: user.companyId };
  if (query.status) where.status = query.status;
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
  const [total, paths] = await Promise.all([
    prisma.learningPath.count({ where }),
    prisma.learningPath.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { courses: true, assignments: true } },
      },
    }),
  ]);
  return { data: paths.map((path) => ({ ...path, courseCount: path._count.courses, assignmentCount: path._count.assignments, _count: undefined })), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getPath(user, id) { return shapePath(await getOwnedPath(user, id)); }

export async function createPath(user, input) {
  assertAdmin(user);
  const path = await prisma.learningPath.create({ data: { companyId: user.companyId, createdById: user.id, title: input.title, description: input.description ?? null } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_CREATED', entity: 'LEARNING_PATH', entityId: path.id, metadata: { title: path.title } });
  return path;
}

export async function updatePath(user, id, input) {
  assertAdmin(user); await getOwnedPath(user, id);
  const path = await prisma.learningPath.update({ where: { id }, data: input });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_UPDATED', entity: 'LEARNING_PATH', entityId: id, metadata: { fields: Object.keys(input) } });
  return path;
}

export async function publishPath(user, id) {
  assertAdmin(user); const path = await getOwnedPath(user, id);
  if (!path.courses.length) throw new AppError('A learning path needs at least one course before publishing', 422, 'PATH_NOT_PUBLISHABLE');
  const updated = await prisma.learningPath.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_PUBLISHED', entity: 'LEARNING_PATH', entityId: id });
  return updated;
}

export async function archivePath(user, id) {
  assertAdmin(user); await getOwnedPath(user, id);
  const updated = await prisma.learningPath.update({ where: { id }, data: { status: 'ARCHIVED' } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_ARCHIVED', entity: 'LEARNING_PATH', entityId: id });
  return updated;
}

export async function addCourse(user, pathId, input) {
  assertAdmin(user); const path = await getOwnedPath(user, pathId);
  const course = await prisma.course.findFirst({ where: { id: input.courseId, companyId: user.companyId, deletedAt: null } });
  if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND');
  if (path.courses.some((row) => row.courseId === input.courseId)) throw new AppError('Course is already in this learning path', 409, 'DUPLICATE');
  const max = await prisma.learningPathCourse.aggregate({ where: { learningPathId: pathId }, _max: { order: true } });
  const row = await prisma.learningPathCourse.create({ data: { learningPathId: pathId, courseId: input.courseId, order: (max._max.order ?? 0) + 1, required: input.required ?? true }, include: { course: true } });
  await logActivity(prisma, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_COURSE_ADDED', entity: 'LEARNING_PATH', entityId: pathId, metadata: { courseId: input.courseId } });
  return row;
}

export async function removeCourse(user, pathId, courseId) {
  assertAdmin(user);
  await getOwnedPath(user, pathId);
  await prisma.learningPathCourse.delete({
    where: { learningPathId_courseId: { learningPathId: pathId, courseId } },
  });
  await logActivity(prisma, {
    userId: user.id,
    companyId: user.companyId,
    action: 'LEARNING_PATH_COURSE_REMOVED',
    entity: 'LEARNING_PATH',
    entityId: pathId,
    metadata: { courseId },
  });
}

export async function reorderCourses(user, pathId, courseIds) {
  assertAdmin(user); const path = await getOwnedPath(user, pathId); const existing = new Set(path.courses.map((row) => row.courseId));
  if (courseIds.length !== existing.size || !courseIds.every((id) => existing.has(id))) throw new AppError('Course order must contain exactly the path courses', 422, 'VALIDATION_ERROR');
  await prisma.$transaction([
    ...courseIds.map((courseId, index) => prisma.learningPathCourse.update({
      where: { learningPathId_courseId: { learningPathId: pathId, courseId } },
      data: { order: 1000 + index },
    })),
    ...courseIds.map((courseId, index) => prisma.learningPathCourse.update({
      where: { learningPathId_courseId: { learningPathId: pathId, courseId } },
      data: { order: index + 1 },
    })),
  ]);
  return getPath(user, pathId);
}

async function resolveTargets(user, input) {
  const base = { companyId: user.companyId, status: 'ACTIVE', role: { name: 'EMPLOYEE' } };
  if (input.employeeIds) return prisma.user.findMany({ where: { ...base, id: { in: [...new Set(input.employeeIds)] } }, select: { id: true } });
  if (input.departmentId) return prisma.user.findMany({ where: { ...base, departmentId: input.departmentId }, select: { id: true } });
  return prisma.user.findMany({ where: { ...base, positionId: input.positionId }, select: { id: true } });
}

export async function assignPath(user, pathId, input) {
  assertAdmin(user); const path = await getOwnedPath(user, pathId);
  if (path.status !== 'PUBLISHED') throw new AppError('Only published learning paths can be assigned', 422, 'PATH_NOT_PUBLISHED');
  const targets = await resolveTargets(user, input); const targetIds = targets.map((row) => row.id); const courses = path.courses.filter((row) => row.course.status === 'PUBLISHED');
  const existing = await prisma.learningPathAssignment.findMany({ where: { learningPathId: pathId, userId: { in: targetIds } }, select: { userId: true } });
  const assigned = new Set(existing.map((row) => row.userId)); const newUsers = targetIds.filter((id) => !assigned.has(id));
  await prisma.$transaction(async (tx) => {
    if (newUsers.length) await tx.learningPathAssignment.createMany({ data: newUsers.map((userId) => ({ learningPathId: pathId, userId, assignedById: user.id, dueDate: input.dueDate ?? null })) });
    for (const userId of targetIds) for (const item of courses) await tx.enrollment.upsert({ where: { userId_courseId: { userId, courseId: item.courseId } }, update: { dueDate: input.dueDate ?? undefined }, create: { userId, courseId: item.courseId, assignedById: user.id, dueDate: input.dueDate ?? null, status: 'ASSIGNED' } });
    for (const userId of newUsers) await tx.notification.create({ data: { userId, title: 'New learning program assigned', message: `You have been assigned "${path.title}".`, type: 'LEARNING_PATH_ASSIGNED' } });
    await logActivity(tx, { userId: user.id, companyId: user.companyId, action: 'LEARNING_PATH_ASSIGNED', entity: 'LEARNING_PATH', entityId: pathId, metadata: { users: newUsers.length, courses: courses.length } });
  });
  return { assigned: newUsers.length, alreadyAssigned: assigned.size, enrollmentsCreated: targetIds.length * courses.length };
}

function progress(path, enrollments) {
  const byCourse = new Map(enrollments.map((row) => [row.courseId, row]));
  const values = path.courses.map((row) => byCourse.get(row.courseId)?.status === 'COMPLETED' ? 100 : 0);
  const value = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  return { progress: value, completedCourses: values.filter((n) => n === 100).length, totalCourses: values.length, status: value >= 100 ? 'COMPLETED' : value > 0 ? 'IN_PROGRESS' : 'NOT_STARTED' };
}

export async function listMyPaths(user) {
  const assignments = await prisma.learningPathAssignment.findMany({ where: { userId: user.id, learningPath: { status: 'PUBLISHED', companyId: user.companyId } }, include: { learningPath: { include: pathInclude } }, orderBy: { assignedAt: 'desc' } });
  const ids = [...new Set(assignments.flatMap((a) => a.learningPath.courses.map((row) => row.courseId)))];
  const enrollmentWhere = { userId: user.id, courseId: { in: ids } };
  const enrollments = ids.length
    ? await prisma.enrollment.findMany({ where: enrollmentWhere })
    : [];
  return assignments.map((assignment) => ({ id: assignment.id, learningPathId: assignment.learningPathId, title: assignment.learningPath.title, description: assignment.learningPath.description, assignedAt: assignment.assignedAt, dueDate: assignment.dueDate, ...progress(assignment.learningPath, enrollments) }));
}

export async function getMyPath(user, assignmentId) {
  const assignment = await prisma.learningPathAssignment.findFirst({
    where: { id: assignmentId, userId: user.id, learningPath: { companyId: user.companyId } },
    include: { learningPath: { include: pathInclude } },
  });
  if (!assignment) throw new AppError('Learning path not found', 404, 'NOT_FOUND');
  const ids = assignment.learningPath.courses.map((row) => row.courseId);
  const enrollmentWhere = { userId: user.id, courseId: { in: ids } };
  const enrollments = await prisma.enrollment.findMany({ where: enrollmentWhere });
  return { ...assignment, ...progress(assignment.learningPath, enrollments), courses: assignment.learningPath.courses.map((row) => ({ ...row.course, required: row.required, progress: enrollments.find((e) => e.courseId === row.courseId)?.status === 'COMPLETED' ? 100 : 0 })) };
}

export async function listProgress(user, pathId, query) {
  assertAdmin(user);
  const path = await getOwnedPath(user, pathId);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const [total, assignments] = await Promise.all([
    prisma.learningPathAssignment.count({ where: { learningPathId: pathId } }),
    prisma.learningPathAssignment.findMany({
      where: { learningPathId: pathId },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  const rows = assignments.length
    ? await prisma.enrollment.findMany({
      where: {
        userId: { in: assignments.map((assignment) => assignment.userId) },
        courseId: { in: path.courses.map((row) => row.courseId) },
      },
    })
    : [];
  return {
    data: assignments.map((assignment) => ({
      assignmentId: assignment.id,
      user: assignment.user,
      dueDate: assignment.dueDate,
      ...progress(path, rows.filter((row) => row.userId === assignment.userId)),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default { listPaths, getPath, createPath, updatePath, publishPath, archivePath, addCourse, removeCourse, reorderCourses, assignPath, listMyPaths, getMyPath, listProgress };
