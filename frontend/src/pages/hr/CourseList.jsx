import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HrLayout from '../../layouts/HrLayout';
import CourseCard from '../../components/CourseCard';
import { SearchInput, FilterDropdown, Pagination, EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as courseService from '../../services/courseService';

const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function CourseList() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['courses', { search, difficulty, status, page }],
    queryFn: () => courseService.listCourses({ ...(search ? { search } : {}), ...(difficulty ? { difficulty } : {}), ...(status ? { status } : {}), page, limit: 12 }),
  });

  return (
    <HrLayout>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-espresso">Courses</h1>
          <p className="text-sm text-espresso/60 mt-1">Manage company learning programs and training content.</p>
        </div>
        <Link
          to="/hr/courses/create"
          className="inline-flex items-center px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
        >
          + Create Course
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search courses..." />
        </div>
        <FilterDropdown label="Difficulty" value={difficulty} onChange={(v) => { setDifficulty(v); setPage(1); }} options={DIFFICULTIES} />
        <FilterDropdown label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUSES} />
      </div>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading courses..." />}
        {query.isError && <ErrorState message="Unable to load courses." onRetry={query.refetch} />}
        {query.isSuccess && query.data.data.length === 0 && (
          <EmptyState title="No courses found." description="Try adjusting your filters, or create your first course." />
        )}
        {query.isSuccess && query.data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {query.data.data.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <Pagination page={page} totalPages={query.data.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </HrLayout>
  );
}
