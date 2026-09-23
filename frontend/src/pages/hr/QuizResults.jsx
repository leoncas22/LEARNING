import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import { StatusBadge, Pagination, EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as quizService from '../../services/quizService';

export default function QuizResults({ basePath = '/hr', Layout = HrLayout }) {
  const { quizId } = useParams();
  const [page, setPage] = useState(1);

  const quizQuery = useQuery({ queryKey: ['quiz', quizId], queryFn: () => quizService.getQuiz(quizId) });
  const resultsQuery = useQuery({
    queryKey: ['quiz-results', quizId, page],
    queryFn: () => quizService.getQuizResults(quizId, { page, limit: 20 }),
  });

  return (
    <Layout>
      <Link to={`${basePath}/quizzes/${quizId}`} className="text-sm text-gold hover:underline">
        ← Back to quiz
      </Link>
      <h1 className="text-2xl font-semibold text-espresso mt-3">{quizQuery.data?.title || 'Quiz'} — Results</h1>
      <p className="text-sm text-espresso/60 mt-1">See who has attempted this quiz and how they scored.</p>

      <div className="mt-6">
        {resultsQuery.isLoading && <LoadingState label="Loading results..." />}
        {resultsQuery.isError && <ErrorState message="Unable to load results." onRetry={resultsQuery.refetch} />}
        {resultsQuery.isSuccess && resultsQuery.data.data.length === 0 && (
          <EmptyState title="No attempts yet." description="Results will appear here once employees start taking this quiz." />
        )}
        {resultsQuery.isSuccess && resultsQuery.data.data.length > 0 && (
          <>
            <div className="overflow-x-auto border border-border-warm rounded-2xl bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-espresso/50 uppercase tracking-wide border-b border-border-warm">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="px-5 py-3 font-medium">Attempts</th>
                    <th className="px-5 py-3 font-medium">Best Score</th>
                    <th className="px-5 py-3 font-medium">Latest Score</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {resultsQuery.data.data.map((row) => (
                    <tr key={row.user.id}>
                      <td className="px-5 py-3 text-espresso font-medium">{row.user.name}</td>
                      <td className="px-5 py-3 text-espresso/60">{row.user.department?.name || '—'}</td>
                      <td className="px-5 py-3 text-espresso/60">{row.attemptCount}</td>
                      <td className="px-5 py-3 text-espresso/60">{row.bestScore}%</td>
                      <td className="px-5 py-3 text-espresso/60">{row.latestScore}%</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.latestStatus} />
                      </td>
                      <td className="px-5 py-3 text-espresso/60">{new Date(row.completedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={resultsQuery.data.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}
