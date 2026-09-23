import prisma from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { assertSameCompany } from '../middleware/companyAccess.js';
import { logActivity } from '../utils/activityLog.js';
import { loadQuizForWrite } from './quiz.service.js';

async function loadQuestionForWrite(actingUser, questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { quiz: { include: { course: true } } },
  });
  if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND');
  assertSameCompany(question.quiz.course.companyId, actingUser);
  if (actingUser.role === 'INSTRUCTOR' && question.quiz.course.instructorId !== actingUser.id) {
    throw new AppError('Question not found', 404, 'NOT_FOUND');
  }
  return question;
}

export async function createQuestion(actingUser, quizId, input) {
  const quiz = await loadQuizForWrite(actingUser, quizId);

  const maxOrder = await prisma.question.aggregate({ where: { quizId }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const question = await prisma.$transaction(async (tx) => {
    const created = await tx.question.create({
      data: {
        quizId,
        type: input.type,
        question: input.question,
        points: input.points,
        explanation: input.explanation ?? null,
        acceptedAnswers: input.type === 'SHORT_ANSWER' ? input.acceptedAnswers : null,
        order: nextOrder,
      },
    });

    if (input.options?.length) {
      await tx.questionOption.createMany({
        data: input.options.map((opt, index) => ({
          questionId: created.id,
          optionText: opt.optionText,
          isCorrect: Boolean(opt.isCorrect),
          order: index,
        })),
      });
    }

    return tx.question.findUnique({ where: { id: created.id }, include: { options: { orderBy: { order: 'asc' } } } });
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUESTION_CREATED',
    entity: 'QUESTION',
    entityId: question.id,
    metadata: { quizId: quiz.id, type: question.type },
  });

  return question;
}

export async function updateQuestion(actingUser, questionId, input) {
  const question = await loadQuestionForWrite(actingUser, questionId);
  const type = input.type ?? question.type;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: questionId },
      data: {
        type,
        question: input.question ?? question.question,
        points: input.points ?? question.points,
        explanation: input.explanation !== undefined ? input.explanation : question.explanation,
        acceptedAnswers: type === 'SHORT_ANSWER' ? input.acceptedAnswers ?? question.acceptedAnswers : null,
      },
    });

    // Options are replaced wholesale when provided — simpler and safer
    // than diffing individual option edits, and options carry no history
    // of their own worth preserving independently of the question.
    if (input.options) {
      await tx.questionOption.deleteMany({ where: { questionId } });
      await tx.questionOption.createMany({
        data: input.options.map((opt, index) => ({
          questionId,
          optionText: opt.optionText,
          isCorrect: Boolean(opt.isCorrect),
          order: index,
        })),
      });
    }

    return tx.question.findUnique({ where: { id: questionId }, include: { options: { orderBy: { order: 'asc' } } } });
  });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUESTION_UPDATED',
    entity: 'QUESTION',
    entityId: questionId,
  });

  return updated;
}

export async function deleteQuestion(actingUser, questionId) {
  const question = await loadQuestionForWrite(actingUser, questionId);

  // Question -> QuizAnswer is Restrict (schema.prisma, Phase 2): a
  // question that already has learner answers on record cannot be
  // deleted — archive the quiz instead. This throws a clear FK error if
  // that's attempted, exactly like Lesson -> LessonProgress in Phase 4.
  await prisma.question.delete({ where: { id: questionId } });

  await logActivity(prisma, {
    userId: actingUser.id,
    companyId: actingUser.companyId,
    action: 'QUESTION_DELETED',
    entity: 'QUESTION',
    entityId: questionId,
    metadata: { quizId: question.quizId },
  });
}

/**
 * Reorders questions using the caller-supplied { id, order } list directly
 * (spec's documented shape for this endpoint), rather than an ordered-id
 * array like Phase 4's module/lesson reorder — validated the same way:
 * every id must belong to this quiz, and the update runs as a two-pass
 * transaction to avoid tripping the (quizId, order) unique constraint.
 */
export async function reorderQuestions(actingUser, quizId, items) {
  await loadQuizForWrite(actingUser, quizId);

  const existing = await prisma.question.findMany({ where: { quizId }, select: { id: true } });
  const existingIds = new Set(existing.map((q) => q.id));
  if (items.length !== existing.length || !items.every((item) => existingIds.has(item.id))) {
    throw new AppError("Reorder list must contain exactly this quiz's questions", 422, 'VALIDATION_ERROR');
  }

  await prisma.$transaction([
    ...items.map((item, index) => prisma.question.update({ where: { id: item.id }, data: { order: 1000 + index } })),
    ...items.map((item) => prisma.question.update({ where: { id: item.id }, data: { order: item.order } })),
  ]);

  return prisma.question.findMany({ where: { quizId }, orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } });
}

export default { createQuestion, updateQuestion, deleteQuestion, reorderQuestions };
