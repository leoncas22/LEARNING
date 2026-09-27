import { useState } from 'react';

const inputClass =
  'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition';

const TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Single Choice' },
  { value: 'MULTIPLE_ANSWER', label: 'Multiple Choice (select several)' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
];

function defaultOptionsFor(type) {
  if (type === 'TRUE_FALSE') {
    return [
      { optionText: 'True', isCorrect: true },
      { optionText: 'False', isCorrect: false },
    ];
  }
  return [
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ];
}

export function QuestionEditor({ initial, onSubmit, onCancel, submitLabel = 'Save Question' }) {
  const [type, setType] = useState(initial?.type || 'MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState(initial?.question || '');
  const [points, setPoints] = useState(initial?.points || 10);
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [options, setOptions] = useState(initial?.options?.length ? initial.options : defaultOptionsFor(type));
  const [acceptedAnswers, setAcceptedAnswers] = useState((initial?.acceptedAnswers || ['']).join('\n'));
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTypeChange(newType) {
    setType(newType);
    if (newType === 'TRUE_FALSE') {
      setOptions(defaultOptionsFor('TRUE_FALSE'));
    } else if (newType === 'MULTIPLE_CHOICE' || newType === 'MULTIPLE_ANSWER') {
      if (type === 'TRUE_FALSE' || options.length < 2) setOptions(defaultOptionsFor(newType));
    }
  }

  function updateOption(index, field, value) {
    setOptions((prev) => {
      const next = [...prev];
      if (field === 'isCorrect' && type === 'MULTIPLE_CHOICE') {
        // Single-choice: selecting one clears the others.
        return next.map((o, i) => ({ ...o, isCorrect: i === index ? value : false }));
      }
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addOption() {
    setOptions((prev) => [...prev, { optionText: '', isCorrect: false }]);
  }

  function removeOption(index) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const payload = {
        type,
        question: questionText,
        points: Number(points),
        explanation: explanation || undefined,
        options: type === 'SHORT_ANSWER' ? undefined : options.filter((o) => o.optionText.trim()),
        acceptedAnswers:
          type === 'SHORT_ANSWER'
            ? acceptedAnswers.split('\n').map((s) => s.trim()).filter(Boolean)
            : undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) setFieldErrors(data.details);
      else setError(data?.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 text-burgundy text-sm px-4 py-2.5">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Question Type</label>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)} className={inputClass}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Question Text</label>
        <textarea required rows={2} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Points</label>
        <input type="number" min="1" required value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} />
      </div>

      {(type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_ANSWER') && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">
            Options — {type === 'MULTIPLE_CHOICE' ? 'select the one correct answer' : 'check all correct answers'}
          </label>
          <div className="space-y-2">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type={type === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'}
                  name="correct-option"
                  checked={opt.isCorrect}
                  onChange={(e) => updateOption(index, 'isCorrect', e.target.checked)}
                  className="w-4 h-4 accent-gold shrink-0"
                  aria-label={`Option ${index + 1} is correct`}
                />
                <input
                  value={opt.optionText}
                  onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className={inputClass}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(index)} className="text-espresso/40 hover:text-burgundy text-sm px-1" aria-label="Remove option">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="mt-2 text-sm text-gold hover:underline font-medium">
            + Add Option
          </button>
          {fieldErrors.options && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.options}</p>}
        </div>
      )}

      {type === 'TRUE_FALSE' && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">Correct Answer</label>
          <div className="flex gap-4">
            {options.map((opt, index) => (
              <label key={opt.optionText} className="flex items-center gap-2 text-sm text-espresso">
                <input
                  type="radio"
                  name="tf-correct"
                  checked={opt.isCorrect}
                  onChange={() => setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })))}
                  className="w-4 h-4 accent-gold"
                />
                {opt.optionText}
              </label>
            ))}
          </div>
        </div>
      )}

      {type === 'SHORT_ANSWER' && (
        <div>
          <label className="block text-sm font-medium text-espresso mb-1.5">Accepted Answers</label>
          <textarea
            rows={3}
            value={acceptedAnswers}
            onChange={(e) => setAcceptedAnswers(e.target.value)}
            className={inputClass}
            placeholder={'One per line, e.g.\nmulti factor authentication\nmulti-factor authentication'}
          />
          <p className="mt-1.5 text-xs text-espresso/50">
            Matching ignores case, extra spaces, and hyphens — &quot;MFA&quot; and &quot;mfa&quot; would need to be listed separately.
          </p>
          {fieldErrors.acceptedAnswers && <p className="mt-1.5 text-sm text-burgundy">{fieldErrors.acceptedAnswers}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-espresso mb-1.5">Explanation (optional)</label>
        <textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} className={inputClass} placeholder="Shown to the learner after grading, if enabled." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition disabled:opacity-50">
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default QuestionEditor;
