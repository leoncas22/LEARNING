import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { useAuth } from '../../hooks/useAuth';
import { LoadingState, ErrorState } from '../../components/ui/Primitives';
import * as learningService from '../../services/learningService';

const CARDS = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['my-learning-summary'], queryFn: learningService.getMyLearningSummary });

  return (
    <EmployeeLayout>
      <h1 className="text-2xl font-semibold text-espresso">Good to see you, {user?.name?.split(' ')[0]} 👋</h1>
      <p className="text-sm text-espresso/60 mt-1">Continue your learning journey.</p>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading your summary..." />}
        {query.isError && <ErrorState message="Unable to load your summary." onRetry={query.refetch} />}
        {query.isSuccess && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CARDS.map((card) => (
              <div key={card.key} className="bg-white border border-border-warm rounded-2xl p-5">
                <p className="text-xs text-espresso/50">{card.label}</p>
                <p className="text-3xl font-semibold text-espresso mt-2">{query.data[card.key]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        to="/employee/courses"
        className="inline-flex items-center mt-6 px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
      >
        Go to My Learning
      </Link>
    </EmployeeLayout>
  );
}
