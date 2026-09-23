import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as attemptService from '../../services/quizAttemptService';

export default function QuizResultPage() {
  const { attemptId } = useParams();
  const query = useQuery({ queryKey: ['quiz-result', attemptId], queryFn: () => attemptService.getAttemptResult(attemptId) });

  if (query.isLoading) {
    return (
      <EmployeeLayout>
        <LoadingState label="Loading your result..." />
      </EmployeeLayout>
    );
  }
  if (query.isError) {
    return (
      <EmployeeLayout>
        <ErrorState message="Unable to load this result." onRetry={query.refetch} />
      </EmployeeLayout>
    );
  }

  const result = query.data;

  return (
    <EmployeeLayout>
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-sm text-espresso/50">{result.quizTitle}</p>
        <p className={`text-5xl font-semibold mt-3 ${result.passed ? 'text-emerald-600' : 'text-burgundy'}`}>{result.score}%</p>
        <p className={`text-lg font-medium mt-2 ${result.passed ? 'text-emerald-700' : 'text-burgundy'}`}>
          {result.passed ? 'PASSED' : 'FAILED'}
        </p>
        <p className="text-sm text-espresso/50 mt-1">Passing score: {result.passingScore}%</p>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="bg-white border border-border-warm rounded-2xl p-4">
            <p className="text-xs text-espresso/50">Correct</p>
            <p className="text-2xl font-semibold text-espresso mt-1">{result.correctCount}</p>
          </div>
          <div className="bg-white border border-border-warm rounded-2xl p-4">
            <p className="text-xs text-espresso/50">Incorrect</p>
            <p className="text-2xl font-semibold text-espresso mt-1">{result.incorrectCount}</p>
          </div>
          <div className="bg-white border border-border-warm rounded-2xl p-4">
            <p className="text-xs text-espresso/50">Points</p>
            <p className="text-2xl font-semibold text-espresso mt-1">
              {result.earnedPoints} / {result.totalPoints}
            </p>
          </div>
        </div>

        <p className="text-xs text-espresso/40 mt-6">
          Attempt {result.attemptNumber} of {result.attemptLimit} · Completed {new Date(result.completedAt).toLocaleDateString()}
        </p>

        {result.review && (
          <div className="mt-10 text-left space-y-4">
            <h2 className="text-sm font-semibold text-espresso uppercase tracking-wide">Review</h2>
            {result.review.map((r) => (
              <div key={r.questionId} className="bg-white border border-border-warm rounded-2xl p-5">
                <p className="text-sm text-espresso font-medium">{r.question}</p>
                <p className={`text-sm mt-2 ${r.isCorrect ? 'text-emerald-700' : 'text-burgundy'}`}>
                  Your answer: {Array.isArray(r.yourAnswer) ? r.yourAnswer.join(', ') || '—' : r.yourAnswer || '—'}
                </p>
                {!r.isCorrect && <p className="text-sm text-espresso/60">Correct answer: {r.correctAnswer.join(', ')}</p>}
                <p className="text-xs text-espresso/40 mt-1">
                  {r.pointsEarned ?? 0} / {r.points} points
                </p>
                {r.explanation && <p className="text-xs text-espresso/50 mt-2">{r.explanation}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3 mt-10">
          <Link to="/employee/quiz-history" className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition">
            View Quiz History
          </Link>
          <Link to="/employee/courses" className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition">
            Back to My Learning
          </Link>
        </div>
      </div>
    </EmployeeLayout>
  );
}
