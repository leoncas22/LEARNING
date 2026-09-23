/**
 * Normalizes a free-text answer for SHORT_ANSWER comparison:
 *   trim -> lowercase -> collapse repeated whitespace -> normalize hyphens
 * to spaces. "Multi-Factor   Authentication" and "multi factor
 * authentication" both normalize to "multi factor authentication".
 */
export function normalizeAnswer(text) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * True if `submitted` matches any of `acceptedAnswers` after normalization.
 */
export function matchesAcceptedAnswer(submitted, acceptedAnswers) {
  if (!Array.isArray(acceptedAnswers) || acceptedAnswers.length === 0) return false;
  const normalizedSubmitted = normalizeAnswer(submitted);
  if (!normalizedSubmitted) return false;
  return acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalizedSubmitted);
}

export default { normalizeAnswer, matchesAcceptedAnswer };
