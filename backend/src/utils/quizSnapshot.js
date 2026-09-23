/**
 * Fisher–Yates shuffle. Used once, at attempt start, to build the
 * questionOrder/optionOrder snapshot stored on QuizAttempt — never called
 * again for that attempt afterward (see schema.prisma QuizAttempt comment
 * and spec Module 41: "do not randomly reshuffle on every API request").
 */
export function shuffleArray(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Builds the immutable presentation snapshot for a new attempt.
 * Returns { questionOrder: [questionId, ...], optionOrder: { [questionId]: [optionId, ...] } }.
 */
export function buildAttemptSnapshot(questions, { shuffleQuestions, shuffleOptions }) {
  const orderedQuestions = shuffleQuestions ? shuffleArray(questions) : questions;
  const questionOrder = orderedQuestions.map((q) => q.id);

  const optionOrder = {};
  for (const question of questions) {
    const ids = (question.options || []).map((o) => o.id);
    optionOrder[question.id] = shuffleOptions ? shuffleArray(ids) : ids;
  }

  return { questionOrder, optionOrder };
}

/**
 * Re-applies a stored snapshot to a freshly-loaded question set, so every
 * subsequent read of an in-progress or historical attempt shows the exact
 * same order it did at the start — even if the quiz was edited (questions
 * reordered/added/removed) afterward. Questions no longer present are
 * dropped; a question added after the attempt started is appended at the
 * end rather than silently omitted (keeps grading correct without hiding
 * new content from a review).
 */
export function applySnapshotOrder(questions, snapshot) {
  if (!snapshot?.questionOrder) return questions;

  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = snapshot.questionOrder.map((id) => byId.get(id)).filter(Boolean);
  const seen = new Set(snapshot.questionOrder);
  const appended = questions.filter((q) => !seen.has(q.id));

  return [...ordered, ...appended].map((question) => {
    const optionIds = snapshot.optionOrder?.[question.id];
    if (!optionIds || !question.options) return question;
    const optionById = new Map(question.options.map((o) => [o.id, o]));
    const orderedOptions = optionIds.map((id) => optionById.get(id)).filter(Boolean);
    const seenOptions = new Set(optionIds);
    const appendedOptions = question.options.filter((o) => !seenOptions.has(o.id));
    return { ...question, options: [...orderedOptions, ...appendedOptions] };
  });
}

export default { shuffleArray, buildAttemptSnapshot, applySnapshotOrder };
