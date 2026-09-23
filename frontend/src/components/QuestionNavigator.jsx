function isAnswered(question) {
  if (!question.myAnswer) return false;
  if (question.type === 'SHORT_ANSWER') return Boolean(question.myAnswer.answerText?.trim());
  return (question.myAnswer.selectedOptionIds || []).length > 0;
}

export function QuestionNavigator({ questions, currentIndex, onSelect }) {
  return (
    <nav aria-label="Question navigation" className="grid grid-cols-6 sm:grid-cols-8 gap-2">
      {questions.map((q, index) => {
        const answered = isAnswered(q);
        const isCurrent = index === currentIndex;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(index)}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={`Question ${index + 1}${answered ? ', answered' : ', not answered'}`}
            className={`h-9 rounded-lg text-sm font-medium border transition flex items-center justify-center ${
              isCurrent
                ? 'bg-espresso text-cream border-espresso'
                : answered
                  ? 'bg-gold/10 text-espresso border-gold/40'
                  : 'bg-white text-espresso/60 border-border-warm'
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </nav>
  );
}

export default QuestionNavigator;
