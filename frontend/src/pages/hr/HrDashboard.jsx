import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HrLayout from '../../layouts/HrLayout';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import { getDashboard, exportTrainingReport } from '../../services/reportingService';

const CARDS = [
  { key: 'totalEmployees', label: 'Total Employees' },
  { key: 'activeEmployees', label: 'Active Employees' },
  { key: 'totalCourses', label: 'Total Courses' },
  { key: 'activeTrainings', label: 'Active Trainings' },
  { key: 'trainingCompletionRate', label: 'Completion Rate', suffix: '%' },
  { key: 'averageQuizScore', label: 'Average Quiz Score' },
  { key: 'activeCertifications', label: 'Active Certifications' },
  { key: 'expiringCertifications', label: 'Expiring in 30 Days' },
];

export default function HrDashboard() {
  const query = useQuery({ queryKey: ['hr-dashboard'], queryFn: async () => (await getDashboard()).data });

  return (
    <HrLayout>
      <h1 className="text-2xl font-semibold text-espresso">Dashboard</h1>
      <p className="text-sm text-espresso/60 mt-1">An overview of learning activity across your company.</p>

      <div className="mt-6">
        {query.isLoading && <LoadingState label="Loading dashboard..." />}
        {query.isError && <ErrorState message="Unable to load dashboard stats." onRetry={query.refetch} />}
        {query.isSuccess && (
          <>
            <div className="flex justify-end mb-4"><button type="button" onClick={exportTrainingReport} className="px-4 py-2 rounded-xl bg-espresso text-white text-sm hover:bg-burgundy transition">Export training CSV</button></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARDS.map((card) => (
              <div key={card.key} className="bg-white border border-border-warm rounded-2xl p-5">
                <p className="text-xs text-espresso/50">{card.label}</p>
                <p className="text-3xl font-semibold text-espresso mt-2">
                  {query.data.kpis?.[card.key] ?? 0}
                  {card.suffix || ''}
                </p>
              </div>
            ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-4 mt-6">
              <section className="bg-white border-border-warm rounded-2xl p-5"><h2 className="font-semibold text-espresso">Training status</h2>{query.data.learning?.status?.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={query.data.learning.status} dataKey="value" nameKey="name" outerRadius={90} label>{query.data.learning.status.map((entry, index) => <Cell key={entry.name} fill={['#B8935A', '#5C1A1A', '#786F65', '#D6B9A5'][index % 4]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyState title="No training activity yet" />}</section>
              <section className="bg-white border-border-warm rounded-2xl p-5"><h2 className="font-semibold text-espresso">Department performance</h2>{query.data.departments?.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={query.data.departments}><CartesianGrid strokeDasharray="3 3" stroke="#E1D6BF" /><XAxis dataKey="department" hide /><YAxis /><Tooltip /><Bar dataKey="completionRate" fill="#B8935A" name="Completion %" /></BarChart></ResponsiveContainer> : <EmptyState title="No department data yet" />}</section>
            </div>
          </>
        )}
      </div>
    </HrLayout>
  );
}
