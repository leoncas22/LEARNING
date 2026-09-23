import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { slugify } from '../utils/slugify.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { logActivity } from '../utils/activityLog.js';
import { getCompletedLessonCountsBulk, toPercentage, isOverdue } from './progress.service.js';

const COURSE_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  thumbnail: true,
  category: true,
  difficulty: true,
  status: true,
  duration: true,
  updatedAt: true,
  instructor: { select: { id: true, name: true } },
  modules: { select: { _count: { select: { lessons: true } } } },
  _count: { select: { enrollments: true } },
};

function shapeCourseCard(course) {
  const lessonCount = course.modules.reduce((sum, m) => sum + m._count.lessons, 0);
  const { modules, _count, ...rest } = course;
  return { ...rest, moduleCount: modules.length, lessonCount, learnerCount: _count.enrollments };
}

/**
 * A course-scoped instructor query filter: Company Admin sees every course
 * in their tenant; Instructor sees only courses they're assigned to.
 * SUPER_ADMIN never reaches here (courses are a tenant resource, not a
 * platform one — no course.routes.js path is open to SUPER_ADMIN).
 */
function roleScopedWhere(actingUser) {
  const where = { companyId: actingUser.companyId, deletedAt: null };
  if (actingUser.role === 'INSTRUCTOR') {
    where.instructorId = actingUser.id;
  }
  return where;
}

async function generateUniqueCourseSlug(companyId, title) {
  const base = slugify(title) || 'course';
  let candidate = base;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.course.findUnique({ where: { companyId_slug: { companyId, slug: candidate } } })) {
    attempt += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}${attempt > 3 ? attempt : ''}`;
  }
  return candidate;
}

async function assertInstructorBelongsToCompany(instructorId, companyId) {
  const instructor = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { id: true, companyId: true, status: true, role: { select: { name: true } } },
  });
  if (!instructor || instructor.companyId !== companyId) {
    throw new AppError('Instructor not found', 404, 'NOT_FOUND');
  }
  if (instructor.role.name !== 'INSTRUCTOR') {
    throw new AppError('Selected user is not an instructor', 422, 'VALIDATION_ERROR', { instructorId: 'Must be a user with the INSTRUCTOR role' });
  }
  return instructor;
}

export async function listCourses(actingUser, query) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['title', 'updatedAt', 'createdAt'],
    defaultSort: 'updatedAt',
  });

  const where = { ...roleScopedWhere(actingUser) };
  if (query.category) where.category = query.category;
  if (query.difficulty) where.difficulty = query.difficulty;
  if (query.status) where.status = query.status;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({ where, select: COURSE_CARD_SELECT, skip, take: limit, orderBy: { [sort]: order } }),
  ]);

  return { data: courses.map(shapeCourseCard), pagination: buildPaginationMeta({ page, limit, total }) };
}

export async function createCourse(actingUser, input) {
  await assertInstructorBelongsToCompany(input.instructorId, actingUser.companyId);
  const slug = await generateUniqueCourseSlug(actingUser.companyId, input.title);

  const course = await prisma.course.create({
    data: {
      companyId: actingUser.companyId,
      instructorId: input.instructorId,
      title: input.title,
      slug,
      description: input.description,
      thumbnail: input.thumbnail || null,
      category: input.category,
      difficulty: input.difficulty,
      duration: input.duration ?? null,
      passingScore: input.passingScore ?? 80,
      status: 'DRAFT',
    },
    select: COURSE_CARD_SELECT,
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_CREATED',
    entity: 'COURSE',
    entityId: course.id,
    metadata: { title: course.title },
  });

  return shapeCourseCard(course);
}

/**
 * Loads a course with full detail: modules/lessons (ordered), instructor,
 * and a learner list with per-user progress computed in bulk (no N+1 —
 * see progress.service.js::getCompletedLessonCountsBulk).
 */
export async function getCourseDetail(actingUser, courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, name: true, email: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
      enrollments: {
        include: {
          user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!course || course.deletedAt) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  assertSameCompany(course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  const userIds = course.enrollments.map((e) => e.userId);
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedCounts = await getCompletedLessonCountsBulk(courseId, userIds);

  const learners = course.enrollments.map((e) => {
    const completed = completedCounts.get(e.userId) ?? 0;
    return {
      enrollmentId: e.id,
      user: e.user,
      status: e.status,
      progress: toPercentage(completed, totalLessons),
      dueDate: e.dueDate,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      overdue: isOverdue(e),
    };
  });

  const { enrollments, ...courseFields } = course;
  return { ...courseFields, learners, totalLessons, learnerCount: learners.length };
}

export async function updateCourse(actingUser, courseId, input) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt) throw new AppError('Course not found', 404, 'NOT_FOUND');
  assertSameCompany(course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  if (input.instructorId) {
    await assertInstructorBelongsToCompany(input.instructorId, actingUser.companyId);
  }

  const data = { ...input };
  if (input.title && input.title !== course.title) {
    data.slug = await generateUniqueCourseSlug(actingUser.companyId, input.title);
  }

  const updated = await prisma.course.update({ where: { id: courseId }, data, select: COURSE_CARD_SELECT });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_UPDATED',
    entity: 'COURSE',
    entityId: courseId,
    metadata: { fields: Object.keys(input) },
  });

  return shapeCourseCard(updated);
}

/**
 * Validates the publish checklist from the spec: title, description,
 * instructor, at least one module, at least one lesson, and every module
 * has at least one lesson. Returns the list of human-readable problems
 * instead of throwing, so the controller can show them all at once rather
 * than one validation error at a time.
 */
export async function getPublishReadiness(actingUser, courseId) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: { include: { lessons: true } } },
  });
  if (!course || course.deletedAt) throw new AppError('Course not found', 404, 'NOT_FOUND');
  assertSameCompany(course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  const problems = [];
  if (!course.title?.trim()) problems.push('Course title is missing');
  if (!course.description?.trim()) problems.push('Course description is missing');
  if (!course.instructorId) problems.push('No instructor assigned');
  if (course.modules.length === 0) problems.push('Course has no modules');
  const emptyModules = course.modules.filter((m) => m.lessons.length === 0);
  if (emptyModules.length > 0) {
    problems.push(`${emptyModules.length} module(s) have no lessons: ${emptyModules.map((m) => m.title).join(', ')}`);
  }
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  if (totalLessons === 0) problems.push('Course has no lessons');

  return { course, ready: problems.length === 0, problems };
}

export async function publishCourse(actingUser, courseId) {
  const { ready, problems } = await getPublishReadiness(actingUser, courseId);
  if (!ready) {
    throw new AppError('Course cannot be published yet.', 422, 'COURSE_NOT_PUBLISHABLE', { problems });
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'PUBLISHED' },
    select: COURSE_CARD_SELECT,
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_PUBLISHED',
    entity: 'COURSE',
    entityId: courseId,
  });

  return shapeCourseCard(updated);
}

export async function archiveCourse(actingUser, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.deletedAt) throw new AppError('Course not found', 404, 'NOT_FOUND');
  assertSameCompany(course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  // Not a hard delete — ARCHIVED just blocks new assignment; existing
  // enrollment/progress/certificate history is left completely intact.
  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status: 'ARCHIVED' },
    select: COURSE_CARD_SELECT,
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'COURSE_ARCHIVED',
    entity: 'COURSE',
    entityId: courseId,
  });

  return shapeCourseCard(updated);
}

export default { listCourses, createCourse, getCourseDetail, updateCourse, getPublishReadiness, publishCourse, archiveCourse };
