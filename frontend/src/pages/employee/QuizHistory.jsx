import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { StatusBadge, EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as attemptService from '../../services/quizAttemptService';

export default function QuizHistory() {
  const query = useQuery({ queryKey: ['my-quiz-history'], queryFn: attemptService.getMyQuizHistory });

  return (
    <EmployeeLayout>
      <h1 className="text-2xl font-semibold text-espresso">Quiz History</h1>
      <p className="text-sm text-espresso/60 mt-1">Every quiz attempt you&apos;ve completed.</p>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading history..." />}
        {query.isError && <ErrorState message="Unable to load your quiz history." onRetry={query.refetch} />}
        {query.isSuccess && query.data.length === 0 && (
          <EmptyState title="No quiz attempts yet." description="Once you complete a quiz, it will show up here." />
        )}
        {query.isSuccess && query.data.length > 0 && (
          <div className="space-y-3">
            {query.data.map((attempt) => (
              <div key={attempt.attemptId} className="bg-white border border-border-warm rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-espresso">{attempt.quiz.title}</p>
                  <p className="text-xs text-espresso/50 mt-0.5">
                    {attempt.quiz.course?.title} · Attempt {attempt.attemptNumber}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-semibold text-espresso">{attempt.score}%</p>
                  <StatusBadge status={attempt.passed ? 'PASSED' : 'FAILED'} />
                  <p className="text-xs text-espresso/40">{new Date(attempt.completedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
