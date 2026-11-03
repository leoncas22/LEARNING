import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowDownToLine, ArrowRight, Award, BookOpen, Building2, CheckCircle2, CircleHelp, GraduationCap, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HrLayout from '../../layouts/HrLayout';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/Primitives';
import { getDashboard, exportTrainingReport } from '../../services/reportingService';
import { useAuth } from '../../hooks/useAuth';

const STATUS_COLORS = { COMPLETED: '#287A55', IN_PROGRESS: '#2563EB', NOT_STARTED: '#B8935A', OVERDUE: '#5C1A1A' };
const STATUS_LABELS = { COMPLETED: 'Completed', IN_PROGRESS: 'In progress', NOT_STARTED: 'Not started', OVERDUE: 'Overdue' };
const KPI_CARDS = [
  { key: 'totalEmployees', label: 'Employees', icon: Users, note: 'Across your company' },
  { key: 'totalCourses', label: 'Published courses', icon: BookOpen, note: 'Available learning content' },
  { key: 'activeTrainings', label: 'Active training', icon: GraduationCap, note: 'Assigned or in progress' },
  { key: 'trainingCompletionRate', label: 'Completion rate', icon: CheckCircle2, suffix: '%', note: 'Training assignments completed' },
];
const number = (value, suffix = '') => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()}${suffix}` : '—';
const isAvailableNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export default function HrDashboard() {
  const { user } = useAuth();
  const [reportState, setReportState] = useState({ loading: false, error: '', success: false });
  const query = useQuery({ queryKey: ['hr-dashboard'], queryFn: async () => (await getDashboard()).data, refetchInterval: 30000, refetchIntervalInBackground: false, retry: 1 });
  const data = query.data;
  const kpis = data || {};
  const statusData = Array.isArray(data?.training?.status) ? data.training.status : [];
  const departments = Array.isArray(data?.departments) ? data.departments : [];

  async function handleExport() {
    if (reportState.loading) return;
    setReportState({ loading: true, error: '', success: false });
    try {
      await exportTrainingReport();
      setReportState({ loading: false, error: '', success: true });
    } catch (error) {
      setReportState({ loading: false, error: error.response?.data?.message || 'Unable to export the training report. Please try again.', success: false });
    }
  }

  return (
    <HrLayout>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Company learning overview</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">Good morning, {user?.name?.split(' ')[0] || 'there'}</h1><p className="mt-2 text-sm text-espresso/65">{user?.company?.name ? `${user.company.name} · ` : ''}A clear view of learning activity and progress across your organization.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/hr/courses/create" className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><BookOpen size={16} /> Create course</Link><Link to="/hr/trainings" className="inline-flex items-center gap-2 rounded-xl border-border-warm bg-white px-4 py-2.5 text-sm font-medium text-espresso transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><GraduationCap size={16} /> Assign training</Link></div>
      </div>
      <section className="relative mt-7 overflow-hidden rounded-2xl bg-espresso px-6 py-6 text-white sm:px-8" aria-label="Company learning snapshot"><div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-white/10" aria-hidden="true" /><div className="pointer-events-none absolute right-14 -top-24 h-56 w-56 rounded-full border-gold/30" aria-hidden="true" /><div className="relative flex-wrap items-end justify-between gap-6"><div className="max-w-xl"><div className="flex items-center gap-2 text-sm font-medium text-[#E8D6B7]"><Building2 size={16} /> Learning at a glance</div><p className="mt-3 text-xl font-semibold">Build a learning culture with measurable progress.</p><p className="mt-2 text-sm leading-6 text-white/70">Monitor training participation, course availability, and completion trends from the same workspace.</p></div><Link to="/hr/users" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Manage employees <ArrowRight size={16} /></Link></div></section>

      <div className="mt-6 flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-espresso">Key indicators</h2><p className="mt-1 text-sm text-espresso/55">Current learning operations</p></div><div className="flex items-center gap-3">{reportState.error && <p className="text-sm text-burgundy" role="alert">{reportState.error}</p>}{reportState.success && <p className="text-sm text-success" role="status">Report downloaded.</p>}<button type="button" disabled={reportState.loading} onClick={handleExport} className="inline-flex items-center gap-2 rounded-xl border-border-warm bg-white px-3.5 py-2.5 text-sm font-medium text-espresso transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50"><ArrowDownToLine size={16} />{reportState.loading ? 'Preparing…' : 'Export CSV'}</button></div></div>

      {query.isLoading && <LoadingState label="Loading company learning data…" />}
      {query.isError && <ErrorState message="Unable to load dashboard statistics." onRetry={query.refetch} />}
      {query.isSuccess && data && <>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{KPI_CARDS.map(({ key, label, icon: Icon, suffix = '', note }) => <article key={key} className="rounded-2xl border-border-warm bg-white p-5 shadow-sm shadow-espresso/[0.02]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-espresso/65">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-gold"><Icon size={18} /></span></div><p className="mt-4 text-3xl font-semibold tracking-tight text-espresso">{isAvailableNumber(kpis[key]) ? number(kpis[key], suffix) : 'Unavailable'}</p><p className="mt-1 text-xs text-espresso/50">{note}</p></article>)}</div>
        <div className="mt-7 grid gap-5 xl:grid-cols-[1.05fr_1.35fr]">
          <section className="rounded-2xl border-border-warm bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-espresso">Training status</h2><p className="mt-1 text-sm text-espresso/55">Each eligible enrollment appears in exactly one status category</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-gold"><Activity size={18} /></span></div>
            {statusData.length > 0 ? <div className="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="h-[230px] min-w-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}</Pie><Tooltip formatter={(value, name) => [Number(value).toLocaleString(), STATUS_LABELS[name] || name]} /></PieChart></ResponsiveContainer></div><ul className="flex flex-wrap gap-x-4 gap-y-2 sm:block sm:space-y-3">{statusData.map((entry) => <li key={entry.name} className="flex items-center gap-2 text-xs text-espresso/70"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }} />{STATUS_LABELS[entry.name] || entry.name}<strong className="font-semibold text-espresso">{number(entry.value)}</strong></li>)}</ul></div> : <EmptyState title="No training activity yet" description="There are no active training assignments to chart." />}
          </section>
          <section className="rounded-2xl border-border-warm bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-espresso">Department performance</h2><p className="mt-1 text-sm text-espresso/55">Training completion rate by department</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-cream text-gold"><Building2 size={18} /></span></div>
            {departments.length ? <div className="mt-5 h-[310px] min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={departments} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#E1D6BF" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#786F65', fontSize: 11 }} /><YAxis type="category" dataKey="department" width={110} tick={{ fill: '#786F65', fontSize: 11 }} /><Tooltip formatter={(value, _name, item) => [value === null ? 'No assignments' : `${value}%`, `${item.payload.completedTrainings}/${item.payload.assignedTrainings} completed`]} /><Bar dataKey="completionRate" name="Completion rate" fill="#B8935A" radius={[0, 5, 5, 0]} maxBarSize={24} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No departments configured" description="Department performance will appear after departments are set up." />}
          </section>
        </div>
        <section className="mt-5 rounded-2xl border-border-warm bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-espresso">Additional indicators</h2><p className="mt-1 text-sm text-espresso/55">Other measures supplied by reporting</p></div><Award size={18} className="text-gold" /></div><div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-border-warm sm:grid-cols-4"><div className="px-2"><p className="text-xs text-espresso/55">Active employees</p><p className="mt-1 text-xl font-semibold text-espresso">{isAvailableNumber(kpis.activeEmployees) ? number(kpis.activeEmployees) : 'Unavailable'}</p></div><div className="px-4"><p className="text-xs text-espresso/55">Average learning progress</p><p className="mt-1 text-xl font-semibold text-espresso">{isAvailableNumber(kpis.averageLearningProgress) ? number(kpis.averageLearningProgress, '%') : 'Unavailable'}</p></div><div className="px-4"><p className="text-xs text-espresso/55">Completed trainings</p><p className="mt-1 text-xl font-semibold text-espresso">{isAvailableNumber(kpis.completedTrainings) ? number(kpis.completedTrainings) : 'Unavailable'}</p></div><div className="px-4"><p className="text-xs text-espresso/55">Quiz and certification insights</p><p className="mt-1 flex items-center gap-1.5 text-xs text-espresso/60"><CircleHelp size={14} /> Not available from this endpoint</p></div></div></section>
      </>}
    </HrLayout>
  );
}
