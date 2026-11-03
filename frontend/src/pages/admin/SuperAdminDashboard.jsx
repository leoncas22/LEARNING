import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, BookOpen, Building2, ShieldCheck, Users, UserCheck, UserCog } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import * as platformAdminService from '../../services/platformAdminService';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';

const number = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';
const dateTime = (value) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

const metrics = [
  { key: 'totalCompanies', label: 'Registered companies', icon: Building2, note: (data) => `${number(data.activeCompanies)} active · ${number(data.suspendedCompanies)} suspended` },
  { key: 'totalUsers', label: 'Platform users', icon: Users, note: (data) => `${number(data.activeUsers)} active` },
  { key: 'superAdmins', label: 'Super admins', icon: ShieldCheck, note: 'Platform-level accounts' },
  { key: 'companyAdmins', label: 'Company admins', icon: UserCog, note: 'Tenant-level administrators' },
  { key: 'instructors', label: 'Instructors', icon: UserCheck, note: 'Course and assessment delivery' },
  { key: 'employees', label: 'Employees', icon: Users, note: 'Learner accounts' },
  { key: 'totalCourses', label: 'Courses', icon: BookOpen, note: (data) => `${number(data.publishedCourses)} published` },
  { key: 'totalEnrollments', label: 'Course assignments', icon: Activity, note: 'Across the platform' },
];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['platform-dashboard'], queryFn: platformAdminService.getDashboard, staleTime: 30_000 });
  const dashboard = query.data;
  const stats = dashboard?.metrics || {};

  return <AdminLayout>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Platform administration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">Welcome back, {user?.name?.split(' ')[0] || 'admin'}</h1><p className="mt-2 text-sm text-espresso/60">One place to oversee organizations, accounts, and LMS activity.</p></div>
      <Link to="/admin/users" className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white hover:bg-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><Users size={16} /> Manage users <ArrowRight size={16} /></Link>
    </header>

    <section className="mt-7 rounded-2xl bg-espresso p-5 text-white sm:p-7"><div className="flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl"><p className="flex items-center gap-2 text-sm font-medium text-[#E8D6B7]"><ShieldCheck size={17} /> Platform control center</p><h2 className="mt-3 text-2xl font-semibold">Control with visibility. Change with accountability.</h2><p className="mt-2 text-sm leading-6 text-white/70">Manage accounts across companies, review recent platform activity, and protect access with logged administrative actions.</p></div><div className="flex flex-wrap gap-2"><Link to="/admin/users" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-espresso hover:bg-cream">User directory</Link><Link to="/admin/companies" className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">Companies</Link></div></div></section>

    {query.isLoading && <LoadingState label="Loading platform overview…" />}
    {query.isError && <ErrorState message="The platform overview could not be loaded." onRetry={query.refetch} />}
    {query.isSuccess && dashboard && <>
      <section className="mt-7"><div className="mb-3"><h2 className="text-lg font-semibold text-espresso">Platform snapshot</h2><p className="mt-1 text-sm text-espresso/55">Live counts from the platform database</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(({ key, label, icon: Icon, note }) => <article key={key} className="rounded-2xl border border-border-warm bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-espresso/60">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-espresso">{number(stats[key])}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-cream text-gold"><Icon size={19} /></span></div><p className="mt-3 text-xs text-espresso/45">{typeof note === 'function' ? note(stats) : note}</p></article>)}</div></section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-espresso">Recently registered companies</h2><p className="mt-1 text-sm text-espresso/55">Latest organizations added to the platform</p></div><Link to="/admin/companies" className="text-sm font-medium text-gold hover:text-espresso">View all</Link></div>
          {dashboard.recentCompanies?.length ? <div className="mt-4 divide-y divide-border-warm">{dashboard.recentCompanies.map((company) => <div key={company.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-espresso">{company.name}</p><p className="mt-0.5 truncate text-xs text-espresso/50">{company.slug} · {number(company.userCount)} users</p></div><StatusBadge status={company.status} /></div>)}</div> : <EmptyState title="No companies yet" description="Registered organizations will appear here." />}
        </section>
        <section className="rounded-2xl border border-border-warm bg-white p-5 sm:p-6"><div><h2 className="font-semibold text-espresso">Recent platform activity</h2><p className="mt-1 text-sm text-espresso/55">Latest recorded administrative and user events</p></div>
          {dashboard.recentActivity?.length ? <div className="mt-4 space-y-4">{dashboard.recentActivity.map((item) => <div key={item.id} className="flex gap-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cream text-gold"><Activity size={15} /></span><div className="min-w-0"><p className="break-words text-sm font-medium text-espresso">{String(item.action || 'Activity').replaceAll('_', ' ')}</p><p className="mt-0.5 text-xs text-espresso/55">{item.user?.name || 'System'}{item.company?.name ? ` · ${item.company.name}` : ''}</p><p className="mt-1 text-[11px] text-espresso/40">{dateTime(item.createdAt)}</p></div></div>)}</div> : <EmptyState title="No activity recorded" description="Actions will appear when users begin using the platform." />}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-border-warm bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-espresso">Recently added users</h2><p className="mt-1 text-sm text-espresso/55">Account activity across all organizations</p></div><Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-gold hover:text-espresso">User directory <ArrowRight size={15} /></Link></div>
        {dashboard.recentUsers?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-border-warm text-xs text-espresso/50"><th className="py-3 pr-4 font-medium">User</th><th className="py-3 pr-4 font-medium">Role</th><th className="py-3 pr-4 font-medium">Company</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 font-medium">Created</th></tr></thead><tbody>{dashboard.recentUsers.map((item) => <tr key={item.id} className="border-b border-border-warm/70 last:border-0"><td className="py-3 pr-4"><p className="font-medium text-espresso">{item.name}</p><p className="text-xs text-espresso/50">{item.email}</p></td><td className="py-3 pr-4"><span className="text-xs font-medium text-espresso">{item.role?.name?.replaceAll('_', ' ') || 'Unknown'}</span></td><td className="py-3 pr-4 text-espresso/65">{item.company?.name || 'Platform'}</td><td className="py-3 pr-4"><StatusBadge status={item.status} /></td><td className="py-3 text-xs text-espresso/55">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No users yet" description="New accounts will show up here." />}
      </section>
    </>}
  </AdminLayout>;
}
