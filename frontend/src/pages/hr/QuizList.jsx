import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import { SearchInput, FilterDropdown, Pagination, StatusBadge, EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as quizService from '../../services/quizService';

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function QuizList({ basePath = '/hr', Layout = HrLayout }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['quizzes', { search, status, page }],
    queryFn: () => quizService.listQuizzes({ ...(search ? { search } : {}), ...(status ? { status } : {}), page, limit: 20 }),
  });

  return (
    <Layout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-espresso">Quizzes</h1>
          <p className="text-sm text-espresso/60 mt-1">Create assessments to evaluate employee understanding.</p>
        </div>
        <Link
          to={`${basePath}/quizzes/create`}
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
        >
          + Create Quiz
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search quizzes..." />
        </div>
        <FilterDropdown label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} />
      </div>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading quizzes..." />}
        {query.isError && <ErrorState message="Unable to load quizzes." onRetry={query.refetch} />}
        {query.isSuccess && query.data.data.length === 0 && (
          <EmptyState title="No quizzes found." description="Create your first quiz to start assessing employees." />
        )}
        {query.isSuccess && query.data.data.length > 0 && (
          <>
            <div className="overflow-x-auto border border-border-warm rounded-2xl bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-espresso/50 uppercase tracking-wide border-b border-border-warm">
                    <th className="px-5 py-3 font-medium">Quiz</th>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Questions</th>
                    <th className="px-5 py-3 font-medium">Passing Score</th>
                    <th className="px-5 py-3 font-medium">Attempts</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {query.data.data.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-cream/40 transition">
                      <td className="px-5 py-3">
                        <Link to={`${basePath}/quizzes/${quiz.id}`} className="font-medium text-espresso hover:text-gold transition">
                          {quiz.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-espresso/60">{quiz.course?.title}</td>
                      <td className="px-5 py-3 text-espresso/60">{quiz.questionCount}</td>
                      <td className="px-5 py-3 text-espresso/60">{quiz.passingScore}%</td>
                      <td className="px-5 py-3 text-espresso/60">{quiz.attemptLimit}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={quiz.status} />
                      </td>
                      <td className="px-5 py-3 text-espresso/60">{new Date(quiz.updatedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={query.data.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}
