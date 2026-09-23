const TYPE_LABELS = {
  MULTIPLE_CHOICE: 'Single Choice',
  MULTIPLE_ANSWER: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
};

export function QuestionCard({ question, index, onEdit, onDelete, onDuplicate }) {
  return (
    <div className="border border-border-warm rounded-2xl bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-espresso/40 font-medium">
            Question {index + 1} · {TYPE_LABELS[question.type]} · {question.points} points
          </p>
          <p className="text-sm text-espresso mt-1.5">{question.question}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={onEdit} className="text-xs text-espresso/60 hover:text-gold">
            Edit
          </button>
          <button type="button" onClick={onDuplicate} className="text-xs text-espresso/60 hover:text-gold">
            Duplicate
          </button>
          <button type="button" onClick={onDelete} className="text-xs text-espresso/60 hover:text-burgundy">
            Delete
          </button>
        </div>
      </div>

      {question.type !== 'SHORT_ANSWER' && question.options?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {question.options.map((opt) => (
            <li key={opt.id} className="flex items-center gap-2 text-sm text-espresso/70">
              <span aria-hidden="true">{question.type === 'MULTIPLE_ANSWER' ? '☐' : '○'}</span>
              {opt.optionText}
              {opt.isCorrect && <span className="text-xs text-emerald-700 font-medium">(correct)</span>}
            </li>
          ))}
        </ul>
      )}

      {question.type === 'SHORT_ANSWER' && question.acceptedAnswers?.length > 0 && (
        <p className="mt-3 text-xs text-espresso/50">Accepted: {question.acceptedAnswers.join(', ')}</p>
      )}
    </div>
  );
}

export default QuestionCard;
