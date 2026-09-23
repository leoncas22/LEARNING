import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as attemptService from '../../services/quizAttemptService';

export default function MyQuizzes() {
  const query = useQuery({ queryKey: ['my-quizzes'], queryFn: attemptService.listMyQuizzes });

  return (
    <EmployeeLayout>
      <h1 className="text-2xl font-semibold text-espresso">My Quizzes</h1>
      <p className="text-sm text-espresso/60 mt-1">Assessments from your enrolled courses.</p>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading quizzes..." />}
        {query.isError && <ErrorState message="Unable to load quizzes." onRetry={query.refetch} />}
        {query.isSuccess && query.data.length === 0 && (
          <EmptyState title="No quizzes available yet." description="Quizzes will appear here once they're published on a course you're enrolled in." />
        )}
        {query.isSuccess && query.data.length > 0 && (
          <div className="space-y-3">
            {query.data.map((quiz) => {
              const exhausted = quiz.attemptsRemaining === 0 && !quiz.hasInProgressAttempt;
              return (
                <div key={quiz.id} className="bg-white border border-border-warm rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-espresso">{quiz.title}</p>
                    <p className="text-xs text-espresso/50 mt-0.5">
                      {quiz.course?.title} · {quiz.questionCount} questions
                      {quiz.timeLimit ? ` · ${quiz.timeLimit} min` : ''}
                    </p>
                    {quiz.bestScore !== null && <p className="text-xs text-espresso/50 mt-0.5">Best score: {quiz.bestScore}%</p>}
                    <p className="text-xs text-espresso/40 mt-0.5">
                      {quiz.attemptsUsed} of {quiz.attemptLimit} attempts used
                    </p>
                  </div>
                  {exhausted ? (
                    <span className="text-sm text-espresso/40">Attempt limit reached</span>
                  ) : (
                    <Link
                      to={`/employee/quizzes/${quiz.id}`}
                      className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
                    >
                      {quiz.hasInProgressAttempt ? 'Continue Quiz' : 'Start Quiz'}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
