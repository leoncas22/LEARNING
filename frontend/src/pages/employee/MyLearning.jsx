import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import MyCourseCard from '../../components/MyCourseCard';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as learningService from '../../services/learningService';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function MyLearning() {
  const [filter, setFilter] = useState('');

  const query = useQuery({
    queryKey: ['my-courses', filter],
    queryFn: () => learningService.listMyCourses({ status: filter || undefined, limit: 50 }),
  });

  return (
    <EmployeeLayout>
      <h1 className="text-2xl font-semibold text-espresso">My Learning</h1>

      <div className="flex items-center gap-2 mt-5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.value ? 'bg-espresso text-cream' : 'bg-white border border-border-warm text-espresso/70 hover:bg-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading your courses..." />}
        {query.isError && <ErrorState message="Unable to load your courses." onRetry={query.refetch} />}
        {query.isSuccess && query.data.data.length === 0 && (
          <EmptyState title="No courses here yet." description="Once your HR team assigns training, it will show up here." />
        )}
        {query.isSuccess && query.data.data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {query.data.data.map((enrollment) => (
              <MyCourseCard key={enrollment.enrollmentId} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
