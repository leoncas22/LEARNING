import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { logActivity } from '../utils/activityLog.js';
import { buildAttemptSnapshot, applySnapshotOrder } from '../utils/quizSnapshot.js';
import { gradeAttempt, determinePassFail } from './quizGrading.service.js';
import { recalculateEmployeeCompetenciesForCourse } from './employeeCompetency.service.js';
import { checkAndIssueCourseCertificates } from './certificateIssuance.service.js';

const FINALIZED_STATUSES = ['GRADED', 'EXPIRED'];

/** Deadline is always computed, never stored — see schema.prisma comment. */
function computeDeadline(attempt, quiz) {
  if (!quiz.timeLimit) return null;
  return new Date(attempt.startedAt.getTime() + quiz.timeLimit * 60 * 1000);
}

function isPastDeadline(attempt, quiz) {
  const deadline = computeDeadline(attempt, quiz);
  return Boolean(deadline && new Date() > deadline);
}

async function assertEnrolledAndCourseAccess(actingUser, courseId) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.companyId !== actingUser.companyId) {
    throw new AppError('Quiz not found', 404, 'NOT_FOUND');
  }
  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: actingUser.id, courseId } } });
  if (!enrollment || enrollment.status === 'CANCELLED') {
    throw new AppError('You do not have access to this quiz', 403, 'FORBIDDEN');
  }
  return course;
}

async function loadQuizWithQuestions(quizId) {
  return prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } },
  });
}

/** Strips isCorrect / acceptedAnswers — the employee-safe question shape. */
function toEmployeeQuestion(question, myAnswer) {
  return {
    id: question.id,
    type: question.type,
    question: question.question,
    points: question.points,
    options: (question.options || []).map((o) => ({ id: o.id, optionText: o.optionText })),
    myAnswer: myAnswer
      ? {
          selectedOptionIds: myAnswer.selectedOptions?.map((so) => so.questionOptionId) ?? [],
          answerText: myAnswer.answerText ?? null,
        }
      : null,
  };
}

/**
 * Grades every saved answer for an attempt and moves it to its terminal
 * state. Shared by a normal on-time submit and by lazy deadline
 * enforcement (§ensureNotExpired) — there is exactly one grading code
 * path, so "submitted normally" and "expired then graded" can never
 * diverge in how they compute a score.
 */
async function gradeAndFinalize(attemptId, { expired }) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { include: { selectedOptions: true } } },
    });
    const quiz = await tx.quiz.findUnique({
      where: { id: attempt.quizId },
      include: { questions: { include: { options: true } } },
    });

    const answersByQuestionId = new Map(
      attempt.answers.map((a) => [
        a.questionId,
        { selectedOptionIds: a.selectedOptions.map((so) => so.questionOptionId), answerText: a.answerText },
      ])
    );

    const graded = gradeAttempt(quiz.questions, answersByQuestionId);

    // Persist per-question grading detail (spec Module 36's HR attempt
    // detail view reads this back later).
    for (const result of graded.results) {
      const existing = attempt.answers.find((a) => a.questionId === result.questionId);
      if (existing) {
        // eslint-disable-next-line no-await-in-loop
        await tx.quizAnswer.update({
          where: { id: existing.id },
          data: { isCorrect: result.isCorrect, pointsEarned: result.pointsEarned },
        });
      }
    }

    const passed = determinePassFail(graded.percentage, quiz.passingScore);
    const now = new Date();

    const updatedAttempt = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: graded.percentage,
        passed,
        status: expired ? 'EXPIRED' : 'GRADED',
        submittedAt: now,
        completedAt: now,
      },
    });

    return { attempt: updatedAttempt, quiz, graded, passed };
  });
}

/**
 * Backend-enforced deadline check — called before every read/write on an
 * IN_PROGRESS attempt. The frontend timer is UI only; this is what
 * actually stops answers being accepted after time runs out.
 */
async function ensureNotExpired(attempt, quiz) {
  if (attempt.status !== 'IN_PROGRESS') return attempt;
  if (!isPastDeadline(attempt, quiz)) return attempt;
  const { attempt: finalized } = await gradeAndFinalize(attempt.id, { expired: true });
  return finalized;
}

export async function listMyQuizzes(actingUser) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId: actingUser.id, status: { not: 'CANCELLED' } },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return [];

  const quizzes = await prisma.quiz.findMany({
    where: { courseId: { in: courseIds }, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      description: true,
      timeLimit: true,
      passingScore: true,
      attemptLimit: true,
      course: { select: { id: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: actingUser.id, quizId: { in: quizzes.map((q) => q.id) } },
    select: { quizId: true, status: true, score: true, passed: true },
  });

  return quizzes.map((quiz) => {
    const mine = attempts.filter((a) => a.quizId === quiz.id);
    const finalized = mine.filter((a) => FINALIZED_STATUSES.includes(a.status));
    const bestScore = finalized.length > 0 ? Math.max(...finalized.map((a) => a.score ?? 0)) : null;
    const { _count, ...rest } = quiz;
    return {
      ...rest,
      questionCount: _count.questions,
      attemptsUsed: finalized.length,
      attemptsRemaining: Math.max(0, quiz.attemptLimit - finalized.length),
      bestScore,
      hasInProgressAttempt: mine.some((a) => a.status === 'IN_PROGRESS'),
    };
  });
}

/**
 * Starts a new attempt, or resumes an already-IN_PROGRESS one — handles
 * page refresh / two-tabs (spec edge cases #4, #5, #17) by never creating
 * a second concurrent attempt for the same quiz+user.
 */
export async function startOrResumeAttempt(actingUser, quizId) {
  const quiz = await loadQuizWithQuestions(quizId);
  if (!quiz || quiz.status !== 'PUBLISHED') {
    throw new AppError('Quiz not found', 404, 'NOT_FOUND');
  }
  await assertEnrolledAndCourseAccess(actingUser, quiz.courseId);

  const existingInProgress = await prisma.quizAttempt.findFirst({
    where: { quizId, userId: actingUser.id, status: 'IN_PROGRESS' },
  });
  if (existingInProgress) {
    const stillActive = await ensureNotExpired(existingInProgress, quiz);
    if (stillActive.status === 'IN_PROGRESS') {
      return getAttemptForTaking(actingUser, stillActive.id);
    }
    // else: it just got expired-and-graded by the check above; fall
    // through to the attempt-limit logic below to see if a new one is allowed.
  }

  const finalizedCount = await prisma.quizAttempt.count({
    where: { quizId, userId: actingUser.id, status: { in: FINALIZED_STATUSES } },
  });
  if (finalizedCount >= quiz.attemptLimit) {
    throw new AppError('You have reached the maximum number of attempts.', 403, 'ATTEMPT_LIMIT_REACHED');
  }

  const snapshot = buildAttemptSnapshot(quiz.questions, {
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: actingUser.id,
      attemptNumber: finalizedCount + 1,
      status: 'IN_PROGRESS',
      questionOrder: snapshot.questionOrder,
      optionOrder: snapshot.optionOrder,
    },
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_ATTEMPT_STARTED',
    entity: 'QUIZ_ATTEMPT',
    entityId: attempt.id,
    metadata: { quizId },
  });

  return getAttemptForTaking(actingUser, attempt.id);
}

export async function getAttemptForTaking(actingUser, attemptId) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { selectedOptions: true } } },
  });
  if (!attempt) throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  // Ownership is the ENTIRE access control for this endpoint — never
  // company/instructor scoped. Employee A can never load Employee B's
  // attempt by id, regardless of company.
  if (attempt.userId !== actingUser.id) {
    throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  }

  const quiz = await loadQuizWithQuestions(attempt.quizId);
  const current = await ensureNotExpired(attempt, quiz);

  const orderedQuestions = applySnapshotOrder(quiz.questions, {
    questionOrder: current.questionOrder,
    optionOrder: current.optionOrder,
  });
  const answersByQuestion = new Map(current.answers?.map((a) => [a.questionId, a]) ?? attempt.answers.map((a) => [a.questionId, a]));

  const deadline = computeDeadline(current, quiz);

  return {
    id: current.id,
    status: current.status,
    attemptNumber: current.attemptNumber,
    startedAt: current.startedAt,
    deadline,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
    },
    questions: orderedQuestions.map((q) => toEmployeeQuestion(q, answersByQuestion.get(q.id))),
  };
}

export async function saveAnswer(actingUser, attemptId, questionId, submission) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.userId !== actingUser.id) throw new AppError('Attempt not found', 404, 'NOT_FOUND');

  const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId } });
  const current = await ensureNotExpired(attempt, quiz);
  if (current.status !== 'IN_PROGRESS') {
    throw new AppError('This attempt is no longer active.', 409, 'ATTEMPT_NOT_ACTIVE');
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.quizId !== attempt.quizId) {
    throw new AppError('Question not found on this quiz', 404, 'NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    const answer = await tx.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, answerText: submission.answerText ?? null },
      update: { answerText: submission.answerText ?? null },
    });

    if (submission.selectedOptionIds) {
      await tx.quizAnswerOption.deleteMany({ where: { quizAnswerId: answer.id } });
      if (submission.selectedOptionIds.length > 0) {
        await tx.quizAnswerOption.createMany({
          data: submission.selectedOptionIds.map((optionId) => ({ quizAnswerId: answer.id, questionOptionId: optionId })),
        });
      }
    }
  });

  return { saved: true, savedAt: new Date() };
}

export async function submitAttempt(actingUser, attemptId) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.userId !== actingUser.id) throw new AppError('Attempt not found', 404, 'NOT_FOUND');

  const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId } });

  // Idempotency: if a concurrent request (double-click, two tabs) already
  // finalized this attempt — whether via deadline or a prior submit —
  // return that result instead of erroring. Only one grading pass ever
  // actually runs; see gradeAndFinalize's own transaction for the
  // authoritative single-write guarantee.
  if (FINALIZED_STATUSES.includes(attempt.status)) {
    return buildResultSummary(attempt, quiz);
  }

  const expired = isPastDeadline(attempt, quiz);
  const { attempt: finalized, graded, passed } = await gradeAndFinalize(attemptId, { expired });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUIZ_ATTEMPT_SUBMITTED',
    entity: 'QUIZ_ATTEMPT',
    entityId: attemptId,
    metadata: { quizId: quiz.id, score: graded.percentage, expired },
  });
  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: passed ? 'QUIZ_PASSED' : 'QUIZ_FAILED',
    entity: 'QUIZ_ATTEMPT',
    entityId: attemptId,
    metadata: { quizId: quiz.id, score: graded.percentage },
  });

  await prisma.notification.create({
    data: {
      userId: actingUser.id,
      title: passed ? 'Quiz Passed' : 'Quiz Completed',
      message: `You ${passed ? 'passed' : 'did not pass'} "${quiz.title}" with a score of ${graded.percentage}%.`,
      type: 'QUIZ_RESULT',
    },
  });

  // Recalculate competencies and check certificate eligibility after a passing attempt
  if (passed) {
    try {
      await recalculateEmployeeCompetenciesForCourse(actingUser.id, quiz.courseId);
      await checkAndIssueCourseCertificates(actingUser.id, quiz.courseId);
    } catch (hookErr) {
      console.error('[CERTIFICATION_QUIZ_HOOK_ERROR] Failed during quiz pass hook:', hookErr);
    }
  }

  return buildResultSummary(finalized, quiz);
}

function buildResultSummary(attempt, quiz) {
  return {
    attemptId: attempt.id,
    status: attempt.status,
    score: attempt.score,
    passed: attempt.passed,
    passingScore: quiz.passingScore,
    attemptNumber: attempt.attemptNumber,
    submittedAt: attempt.submittedAt,
  };
}

/**
 * Employee's own result view. Correct-answer detail is gated by
 * quiz.showCorrectAnswers — see spec Module 51: only the score/result
 * summary is guaranteed, never the answer key, unless the quiz owner
 * explicitly opted in.
 */
export async function getMyAttemptResult(actingUser, attemptId) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { answers: { include: { selectedOptions: true, question: { include: { options: true } } } } },
  });
  if (!attempt) throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  if (attempt.userId !== actingUser.id) throw new AppError('Attempt not found', 404, 'NOT_FOUND');
  if (!FINALIZED_STATUSES.includes(attempt.status)) {
    throw new AppError('This attempt has not been graded yet.', 409, 'ATTEMPT_NOT_GRADED');
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId }, select: { title: true, passingScore: true, showCorrectAnswers: true, attemptLimit: true } });

  const correctCount = attempt.answers.filter((a) => a.isCorrect === true).length;
  const incorrectCount = attempt.answers.filter((a) => a.isCorrect === false).length;
  const totalPoints = attempt.answers.reduce((sum, a) => sum + (a.question?.points ?? 0), 0);
  const earnedPoints = attempt.answers.reduce((sum, a) => sum + (a.pointsEarned ?? 0), 0);

  const review = quiz.showCorrectAnswers
    ? attempt.answers.map((a) => ({
        questionId: a.questionId,
        question: a.question.question,
        yourAnswer: a.selectedOptions.length
          ? a.selectedOptions.map((so) => a.question.options.find((o) => o.id === so.questionOptionId)?.optionText)
          : a.answerText,
        correctAnswer: a.question.options.filter((o) => o.isCorrect).map((o) => o.optionText),
        isCorrect: a.isCorrect,
        pointsEarned: a.pointsEarned,
        points: a.question.points,
        explanation: a.question.explanation,
      }))
    : null;

  return {
    quizTitle: quiz.title,
    attemptNumber: attempt.attemptNumber,
    attemptLimit: quiz.attemptLimit,
    score: attempt.score,
    passed: attempt.passed,
    passingScore: quiz.passingScore,
    correctCount,
    incorrectCount,
    totalPoints,
    earnedPoints,
    completedAt: attempt.completedAt,
    review,
  };
}

export async function getMyQuizHistory(actingUser) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: actingUser.id, status: { in: FINALIZED_STATUSES } },
    orderBy: { completedAt: 'desc' },
    include: { quiz: { select: { id: true, title: true, course: { select: { id: true, title: true } } } } },
  });

  return attempts.map((a) => ({
    attemptId: a.id,
    quiz: a.quiz,
    attemptNumber: a.attemptNumber,
    score: a.score,
    passed: a.passed,
    status: a.status,
    completedAt: a.completedAt,
  }));
}

export default {
  listMyQuizzes,
  startOrResumeAttempt,
  getAttemptForTaking,
  saveAnswer,
  submitAttempt,
  getMyAttemptResult,
  getMyQuizHistory,
};
