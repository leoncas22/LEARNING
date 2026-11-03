 import { useState } from 'react';
 import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '../../layouts/InstructorLayout';
import * as courseService from '../../services/courseService';
import { LoadingState, ErrorState, EmptyState, StatusBadge, SearchInput, FilterDropdown, Pagination } from '../../components/ui/Primitives';

export default function InstructorCourses() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['instructor-courses', { search, status, page }],
    queryFn: () => courseService.listCourses({ search: search || undefined, status: status || undefined, page, limit: 12, sort: 'updatedAt', order: 'desc' }),
  });
  const courses = query.data?.data || [];
  const pagination = query.data?.pagination;
  return <InstructorLayout>
    <h1 className="text-2xl font-semibold text-espresso">My Courses</h1>
    <p className="text-sm text-espresso/60 mt-1">Courses assigned to you for content management and learner support.</p>
    <div className="flex flex-wrap gap-3 mt-5">
      <div className="flex-1 min-w-[220px]"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search my courses..." /></div>
      <FilterDropdown label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: 'DRAFT', label: 'Draft' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'ARCHIVED', label: 'Archived' }]} />
    </div>
    {query.isLoading && <LoadingState label="Loading courses..." />}
    {query.isError && <ErrorState message="Unable to load courses." onRetry={query.refetch} />}
    {query.isSuccess && courses.length === 0 && <EmptyState title="No courses found." description="Assigned courses will appear here. Try adjusting your filters." />}
    {query.isSuccess && courses.length > 0 && <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">{courses.map((course) => <Link key={course.id} to={`/instructor/courses/${course.id}`} className="bg-white border-border-warm rounded-2xl p-5 hover:border-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="flex justify-between gap-3"><h2 className="font-medium text-espresso">{course.title}</h2><StatusBadge status={course.status} /></div><p className="text-sm text-espresso/60 mt-3">{course.learnerCount} learners · {course.moduleCount} modules · {course.lessonCount} lessons</p><p className="text-xs text-espresso/40 mt-3">{course.category || 'Uncategorized'} · {course.difficulty}</p></Link>)}</div>
      {pagination && <Pagination page={pagination.page} totalPages={pagination.totalPages} onChange={setPage} />}
    </>}
  </InstructorLayout>;
}
