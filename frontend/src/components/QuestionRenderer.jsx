export function QuestionRenderer({ question, value, onChange }) {
  const selectedOptionIds = value?.selectedOptionIds || [];
  const answerText = value?.answerText || '';

  if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
    return (
      <fieldset>
        <legend className="sr-only">{question.question}</legend>
        <div className="space-y-2.5">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border-warm bg-white cursor-pointer hover:bg-cream/40 transition has-[:checked]:border-gold has-[:checked]:bg-gold/5"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={selectedOptionIds[0] === opt.id}
                onChange={() => onChange({ selectedOptionIds: [opt.id] })}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-sm text-espresso">{opt.optionText}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'MULTIPLE_ANSWER') {
    const toggle = (optionId) => {
      const next = selectedOptionIds.includes(optionId)
        ? selectedOptionIds.filter((id) => id !== optionId)
        : [...selectedOptionIds, optionId];
      onChange({ selectedOptionIds: next });
    };
    return (
      <fieldset>
        <legend className="sr-only">{question.question}</legend>
        <div className="space-y-2.5">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border-warm bg-white cursor-pointer hover:bg-cream/40 transition has-[:checked]:border-gold has-[:checked]:bg-gold/5"
            >
              <input
                type="checkbox"
                checked={selectedOptionIds.includes(opt.id)}
                onChange={() => toggle(opt.id)}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-sm text-espresso">{opt.optionText}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.type === 'SHORT_ANSWER') {
    return (
      <div>
        <label htmlFor={`answer-${question.id}`} className="sr-only">
          Your answer
        </label>
        <input
          id={`answer-${question.id}`}
          value={answerText}
          onChange={(e) => onChange({ answerText: e.target.value })}
          placeholder="Type your answer..."
          className="w-full rounded-xl border border-border-warm bg-white px-4 py-3 text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
        />
      </div>
    );
  }

  return null;
}

export default QuestionRenderer;
