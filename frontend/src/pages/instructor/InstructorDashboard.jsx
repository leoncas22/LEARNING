import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CircleHelp, GraduationCap, Users } from 'lucide-react';
import InstructorLayout from '../../layouts/InstructorLayout';
import * as instructorService from '../../services/instructorService';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';

const metricRows = [
  { key: 'assignedCourses', label: 'Courses', icon: BookOpen },
  { key: 'totalLearners', label: 'Learners reached', icon: Users },
  { key: 'activeLearners', label: 'Currently learning', icon: GraduationCap },
  { key: 'averageQuizScore', label: 'Average quiz score', icon: CircleHelp, suffix: '%' },
];
const format = (value, suffix = '') => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()}${suffix}` : '—';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['instructor-dashboard'], queryFn: instructorService.getDashboard });
  const dashboard = query.data?.data;
  const metrics = dashboard?.metrics || {};
  const courses = Array.isArray(dashboard?.courses) ? dashboard.courses : [];

  return <InstructorLayout>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Teaching workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">Welcome back, {user?.name?.split(' ')[0] || 'instructor'}</h1><p className="mt-2 text-sm text-espresso/60">Shape your course portfolio and stay close to learner progress.</p></div>
      <Link to="/instructor/courses" className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">Manage courses <ArrowRight size={16} /></Link>
    </header>

    <section className="mt-7 grid gap-5 rounded-2xl border-border-warm bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
      <div><div className="flex items-center gap-2 text-sm font-semibold text-gold"><BookOpen size={17} /> Your teaching portfolio</div><h2 className="mt-3 text-xl font-semibold text-espresso">Create a focused learning experience.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-espresso/60">Review course content, check learner engagement, and keep assessments connected to your lessons.</p></div>
      <div className="flex flex-wrap gap-2"><Link to="/instructor/learners" className="rounded-xl border-border-warm px-4 py-2.5 text-sm font-medium text-espresso transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">Learners</Link><Link to="/instructor/quizzes" className="rounded-xl border-border-warm px-4 py-2.5 text-sm font-medium text-espresso transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">Quizzes</Link></div>
    </section>

    {query.isLoading && <LoadingState label="Loading your teaching workspace…" />}
    {query.isError && <ErrorState message="Unable to load your instructor dashboard." onRetry={query.refetch} />}
    {query.isSuccess && dashboard && <>
      <section className="mt-7">
        <div className="mb-3"><h2 className="text-lg font-semibold text-espresso">Teaching snapshot</h2><p className="mt-1 text-sm text-espresso/55">A few useful signals from your courses</p></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{metricRows.map(({ key, label, icon: Icon, suffix = '' }) => <article key={key} className="flex items-center gap-4 rounded-2xl border-border-warm bg-white p-4 sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-gold"><Icon size={19} /></span><div className="min-w-0"><p className="text-xs text-espresso/55">{label}</p><p className="mt-1 text-2xl font-semibold text-espresso">{format(metrics[key], suffix)}</p></div></article>)}</div>
        <p className="mt-2 text-xs text-espresso/45">Quiz score is returned by instructor reporting; the API reports 0 when there are no attempts.</p>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-espresso">Course portfolio</h2><p className="mt-1 text-sm text-espresso/55">Courses assigned to your instructor account</p></div><Link to="/instructor/courses" className="text-sm font-medium text-gold hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">View all courses</Link></div>
        {courses.length === 0 ? <div className="mt-4 rounded-2xl border-border-warm bg-white"><EmptyState title="No courses assigned yet" description="Courses assigned to you will appear here. You can still explore the learner and quiz workspaces." action={<div className="flex justify-center gap-3"><Link to="/instructor/learners" className="text-sm font-medium text-gold">View learners</Link><Link to="/instructor/quizzes" className="text-sm font-medium text-gold">Manage quizzes</Link></div>} /></div> : <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{courses.slice(0, 6).map((course) => <Link key={course.id} to={`/instructor/courses/${course.id}`} className="group rounded-2xl border-border-warm bg-white p-5 transition hover:border-gold hover:shadow-md hover:shadow-espresso/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cream text-gold"><BookOpen size={19} /></div><StatusBadge status={course.status} /></div><h3 className="mt-4 font-semibold text-espresso group-hover:text-burgundy">{course.title}</h3><p className="mt-1 text-xs text-espresso/55">{course.category || 'Course'}{course.difficulty ? ` · ${course.difficulty.toLowerCase()}` : ''}</p><div className="mt-5 grid grid-cols-3 border-t border-border-warm pt-4 text-center"><div><p className="text-lg font-semibold text-espresso">{format(course.learnerCount)}</p><p className="text-[11px] text-espresso/50">Learners</p></div><div><p className="text-lg font-semibold text-espresso">{format(course.moduleCount)}</p><p className="text-[11px] text-espresso/50">Modules</p></div><div><p className="text-lg font-semibold text-espresso">{format(course.quizCount)}</p><p className="text-[11px] text-espresso/50">Quizzes</p></div></div></Link>)}</div>}
      </section>
    </>}
  </InstructorLayout>;
}
