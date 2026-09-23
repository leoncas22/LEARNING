import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { loadQuizForWrite } from './quiz.service.js';
import { assertSameCompany } from '../middleware/companyAccess.js';

const FINALIZED_STATUSES = ['GRADED', 'EXPIRED'];

/**
 * One row per employee who has at least one finalized attempt on this
 * quiz — best score, latest score, latest status, completion date.
 */
export async function getQuizResults(actingUser, quizId, query) {
  await loadQuizForWrite(actingUser, quizId);
  const { page, limit, skip } = parsePagination(query, { defaultSort: 'completedAt' });

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, status: { in: FINALIZED_STATUSES } },
    orderBy: { completedAt: 'desc' },
    include: { user: { select: { id: true, name: true, department: { select: { id: true, name: true } } } } },
  });

  const byUser = new Map();
  for (const attempt of attempts) {
    if (!byUser.has(attempt.userId)) byUser.set(attempt.userId, []);
    byUser.get(attempt.userId).push(attempt);
  }

  const rows = [...byUser.entries()].map(([userId, userAttempts]) => {
    const sorted = [...userAttempts].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const latest = sorted[0];
    const bestScore = Math.max(...userAttempts.map((a) => a.score ?? 0));
    return {
      user: latest.user,
      attemptCount: userAttempts.length,
      bestScore,
      latestScore: latest.score,
      latestStatus: latest.passed ? 'PASSED' : 'FAILED',
      completedAt: latest.completedAt,
    };
  });

  rows.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  const total = rows.length;
  const paged = rows.slice(skip, skip + limit);

  return { data: paged, pagination: buildPaginationMeta({ page, limit, total }) };
}

/**
 * Full detail for one attempt — always includes the correct-answer
 * breakdown for staff, regardless of quiz.showCorrectAnswers (that flag
 * only gates what the LEARNER sees; HR/Instructor reviewing a submission
 * are authorized to see everything).
 */
export async function getAttemptDetailForStaff(actingUser, attemptId) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { id: true, name: true, companyId: true, department: { select: { name: true } } } },
      quiz: { include: { course: true } },
      answers: { include: { selectedOptions: true, question: { include: { options: true } } } },
    },
  });
  if (!attempt) throw new AppError('Attempt not found', 404, 'NOT_FOUND');

  assertSameCompany(attempt.quiz.course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && attempt.quiz.course.instructorId !== actingUser.id) {
    throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  }
  // Belt and suspenders: the attempt's own user must also be in this
  // company (guards against a data inconsistency ever leaking cross-tenant).
  assertSameCompany(attempt.user.companyId, actingUser);

  return {
    id: attempt.id,
    user: attempt.user,
    quiz: { id: attempt.quiz.id, title: attempt.quiz.title },
    attemptNumber: attempt.attemptNumber,
    score: attempt.score,
    passed: attempt.passed,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    questions: attempt.answers.map((a) => ({
      question: a.question.question,
      type: a.question.type,
      employeeAnswer: a.selectedOptions.length
        ? a.selectedOptions.map((so) => a.question.options.find((o) => o.id === so.questionOptionId)?.optionText)
        : a.answerText,
      correctAnswer: a.question.options.filter((o) => o.isCorrect).map((o) => o.optionText),
      points: a.question.points,
      pointsEarned: a.pointsEarned,
      isCorrect: a.isCorrect,
    })),
  };
}

export default { getQuizResults, getAttemptDetailForStaff };
