import { matchesAcceptedAnswer } from '../utils/normalizeAnswer.js';

/**
 * Grades a single question against a submitted answer.
 *
 * `question` must include its `options` (each { id, isCorrect }) for
 * choice-type questions. `submission` shape depends on type:
 *   MULTIPLE_CHOICE / TRUE_FALSE : { selectedOptionIds: [oneId] }
 *   MULTIPLE_ANSWER              : { selectedOptionIds: [...ids] }
 *   SHORT_ANSWER                 : { answerText: string }
 *
 * Returns { isCorrect, pointsEarned }. For ESSAY (reserved, not exposed in
 * the Phase 5 UI) both are null — "not yet gradable automatically" rather
 * than "wrong".
 */
export function gradeQuestion(question, submission) {
  const { type, points, options = [] } = question;

  switch (type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE': {
      // Single-select: exactly one option chosen, and it must be the
      // (exactly one, by construction) correct option.
      const selected = submission?.selectedOptionIds || [];
      const correctOption = options.find((o) => o.isCorrect);
      const isCorrect = Boolean(correctOption) && selected.length === 1 && selected[0] === correctOption.id;
      return { isCorrect, pointsEarned: isCorrect ? points : 0 };
    }

    case 'MULTIPLE_ANSWER': {
      // All-or-nothing set equality — see spec Module 21. Any mismatch,
      // missing, or extra selection scores zero.
      const selected = new Set(submission?.selectedOptionIds || []);
      const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));
      const isCorrect =
        correctIds.size > 0 && selected.size === correctIds.size && [...selected].every((id) => correctIds.has(id));
      return { isCorrect, pointsEarned: isCorrect ? points : 0 };
    }

    case 'SHORT_ANSWER': {
      const isCorrect = matchesAcceptedAnswer(submission?.answerText, question.acceptedAnswers);
      return { isCorrect, pointsEarned: isCorrect ? points : 0 };
    }

    case 'ESSAY':
    default:
      return { isCorrect: null, pointsEarned: null };
  }
}

/**
 * Grades every question in a quiz attempt.
 *
 * `questions` — the quiz's questions, each with `.options`.
 * `answersByQuestionId` — Map<questionId, submission>.
 *
 * Unanswered questions score 0 (spec Module 30 default) rather than being
 * excluded from totalPoints — an unanswered question still "counts" for
 * the denominator.
 */
export function gradeAttempt(questions, answersByQuestionId) {
  let totalPoints = 0;
  let earnedPoints = 0;
  const results = [];

  for (const question of questions) {
    totalPoints += question.points;
    const submission = answersByQuestionId.get(question.id) ?? null;
    const graded = gradeQuestion(question, submission);
    earnedPoints += graded.pointsEarned ?? 0;
    results.push({ questionId: question.id, submission, ...graded });
  }

  const percentage = totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);
  return { totalPoints, earnedPoints, percentage, results };
}

export function determinePassFail(percentage, passingScore) {
  return percentage >= passingScore;
}

export default { gradeQuestion, gradeAttempt, determinePassFail };
