import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { logActivity } from '../utils/activityLog.js';

const QUIZ_LIST_SELECT = {
  id: true,
  title: true,
  status: true,
  passingScore: true,
  timeLimit: true,
  attemptLimit: true,
  updatedAt: true,
  course: { select: { id: true, title: true } },
  _count: { select: { questions: true } },
};

function shapeQuizCard(quiz) {
  const { _count, ...rest } = quiz;
  return { ...rest, questionCount: _count.questions };
}

/** Instructor sees only quizzes on courses they're assigned to. */
function roleScopedWhere(actingUser) {
  const where = { course: { companyId: actingUser.companyId } };
  if (actingUser.role === 'INSTRUCTOR') {
    where.course.instructorId = actingUser.id;
  }
  return where;
}

/**
 * Loads a quiz + its parent course and checks tenant/instructor ownership
 * — the one gate every quiz/question write path goes through, mirroring
 * loadCourseForWrite from module.service.js.
 */
export async function loadQuizForWrite(actingUser, quizId) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
  if (!quiz) throw new AppError('Quiz not found', 404, 'NOT_FOUND');
  assertSameCompany(quiz.course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && quiz.course.instructorId !== actingUser.id) {
    throw new AppError('Quiz not found', 404, 'NOT_FOUND');
  }
  return quiz;
}

export async function listQuizzes(actingUser, query) {
  const { page, limit, search, sort, order, skip } = parsePagination(query, {
    sortableFields: ['title', 'updatedAt', 'createdAt'],
    defaultSort: 'updatedAt',
  });

  const where = { ...roleScopedWhere(actingUser) };
  if (query.courseId) where.courseId = query.courseId;
  if (query.status) where.status = query.status;
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [total, quizzes] = await Promise.all([
    prisma.quiz.count({ where }),
    prisma.quiz.findMany({ where, select: QUIZ_LIST_SELECT, skip, take: limit, orderBy: { [sort]: order } }),
  ]);

  return { data: quizzes.map(shapeQuizCard), pagination: buildPaginationMeta({ page, limit, total }) };
}

export async function createQuiz(actingUser, input) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course || course.deletedAt || course.companyId !== actingUser.companyId) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }
  if (actingUser.role === 'INSTRUCTOR' && course.instructorId !== actingUser.id) {
    throw new AppError('Course not found', 404, 'NOT_FOUND');
  }

  if (input.lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: input.lessonId }, include: { module: true } });
    if (!lesson || lesson.module.courseId !== input.courseId) {
      throw new AppError('Lesson not found on this course', 404, 'NOT_FOUND');
    }
  }

  const quiz = await prisma.quiz.create({
    data: {
      courseId: input.courseId,
      lessonId: input.lessonId ?? null,
      title: input.title,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      timeLimit: input.timeLimit ?? null,
      passingScore: input.passingScore ?? 80,
      attemptLimit: input.attemptLimit ?? 1,
      shuffleQuestions: input.shuffleQuestions ?? false,
      shuffleOptions: input.shuffleOptions ?? false,
      showCorrectAnswers: input.showCorrectAnswers ?? false,
      createdById: actingUser.id,
      status: 'DRAFT',
    },
    select: QUIZ_LIST_SELECT,
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_CREATED',
    entity: 'QUIZ',
    entityId: quiz.id,
    metadata: { title: quiz.title, courseId: input.courseId },
  });

  return shapeQuizCard(quiz);
}

/**
 * Full builder view — includes isCorrect on every option and
 * acceptedAnswers on SHORT_ANSWER questions. Staff-only; never reachable
 * by the employee-facing quiz-taking API (see quizAttempt.service.js,
 * which uses a completely separate, stripped-down select).
 */
export async function getQuizDetail(actingUser, quizId) {
  await loadQuizForWrite(actingUser, quizId);
  const full = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { id: true, title: true } },
      lesson: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { attempts: true } },
    },
  });
  const { _count, ...rest } = full;
  return { ...rest, attemptCount: _count.attempts };
}

export async function updateQuiz(actingUser, quizId, input) {
  await loadQuizForWrite(actingUser, quizId);

  if (input.lessonId) {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    const lesson = await prisma.lesson.findUnique({ where: { id: input.lessonId }, include: { module: true } });
    if (!lesson || lesson.module.courseId !== quiz.courseId) {
      throw new AppError('Lesson not found on this course', 404, 'NOT_FOUND');
    }
  }

  const updated = await prisma.quiz.update({ where: { id: quizId }, data: input, select: QUIZ_LIST_SELECT });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_UPDATED',
    entity: 'QUIZ',
    entityId: quizId,
  });

  return shapeQuizCard(updated);
}

/**
 * Publish checklist from spec Module 10: title, description, >=1 question,
 * every question validly configured, points > 0, valid passing score /
 * attempt limit. All problems are collected and returned together, same
 * pattern as course.service.js::getPublishReadiness.
 */
export async function getPublishReadiness(actingUser, quizId) {
  await loadQuizForWrite(actingUser, quizId);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { options: true } } },
  });

  const problems = [];
  if (!quiz.title?.trim()) problems.push('Quiz title is missing');
  if (!quiz.description?.trim()) problems.push('Quiz description is missing');
  if (quiz.questions.length === 0) problems.push('Quiz has no questions');

  for (const [index, q] of quiz.questions.entries()) {
    const label = `Question ${index + 1}`;
    if (q.points <= 0) problems.push(`${label}: points must be greater than 0`);

    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_ANSWER') {
      if (q.options.length < 2) problems.push(`${label}: needs at least 2 options`);
      if (!q.options.some((o) => o.isCorrect)) problems.push(`${label}: needs a correct option`);
      if (q.type === 'MULTIPLE_CHOICE' && q.options.filter((o) => o.isCorrect).length > 1) {
        problems.push(`${label}: single choice question has more than one correct option`);
      }
    }
    if (q.type === 'TRUE_FALSE') {
      if (q.options.length !== 2) problems.push(`${label}: True/False needs exactly 2 options`);
      if (q.options.filter((o) => o.isCorrect).length !== 1) problems.push(`${label}: True/False needs exactly one correct option`);
    }
    if (q.type === 'SHORT_ANSWER' && (!q.acceptedAnswers || q.acceptedAnswers.length === 0)) {
      problems.push(`${label}: needs at least one accepted answer`);
    }
  }

  if (quiz.passingScore < 0 || quiz.passingScore > 100) problems.push('Passing score must be between 0 and 100');
  if (quiz.attemptLimit < 1) problems.push('Maximum attempts must be at least 1');

  return { quiz, ready: problems.length === 0, problems };
}

export async function publishQuiz(actingUser, quizId) {
  const { ready, problems } = await getPublishReadiness(actingUser, quizId);
  if (!ready) {
    throw new AppError('Quiz cannot be published yet.', 422, 'QUIZ_NOT_PUBLISHABLE', { problems });
  }

  const updated = await prisma.quiz.update({ where: { id: quizId }, data: { status: 'PUBLISHED' }, select: QUIZ_LIST_SELECT });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_PUBLISHED',
    entity: 'QUIZ',
    entityId: quizId,
  });

  return shapeQuizCard(updated);
}

export async function archiveQuiz(actingUser, quizId) {
  await loadQuizForWrite(actingUser, quizId);

  // Not a hard delete — ARCHIVED blocks new attempts; existing
  // QuizAttempt/QuizAnswer history is left completely intact (Restrict
  // Foreign keys already guarantee this at the database level).
  const updated = await prisma.quiz.update({ where: { id: quizId }, data: { status: 'ARCHIVED' }, select: QUIZ_LIST_SELECT });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_ARCHIVED',
    entity: 'QUIZ',
    entityId: quizId,
  });

  return shapeQuizCard(updated);
}

export default { loadQuizForWrite, listQuizzes, createQuiz, getQuizDetail, updateQuiz, getPublishReadiness, publishQuiz, archiveQuiz };
