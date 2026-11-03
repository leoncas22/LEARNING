import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, BookOpen, CalendarClock, CheckCircle2, CircleHelp, Clock3, Compass, History, Megaphone, Network } from 'lucide-react';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { useAuth } from '../../hooks/useAuth';
import { LoadingState, ErrorState, EmptyState, ProgressBar, StatusBadge } from '../../components/ui/Primitives';
import * as learningService from '../../services/learningService';

const format = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '—';
const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No deadline';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const summaryQuery = useQuery({ queryKey: ['my-learning-summary'], queryFn: learningService.getMyLearningSummary });
  const coursesQuery = useQuery({ queryKey: ['my-courses', 'dashboard'], queryFn: () => learningService.listMyCourses({ limit: 100 }) });
  const summary = summaryQuery.data;
  const courses = Array.isArray(coursesQuery.data?.data) ? coursesQuery.data.data : [];
  const activeCourses = courses.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status));
  const currentCourse = activeCourses.find((item) => item.status === 'IN_PROGRESS') || activeCourses.find((item) => item.status === 'ASSIGNED') || activeCourses[0];
  const deadlines = activeCourses.filter((item) => item.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 4);
  const totalAssigned = summary?.totalAssigned;
  const completed = summary?.completed;
  const progress = Number.isFinite(Number(totalAssigned)) && Number(totalAssigned) > 0 && Number.isFinite(Number(completed)) ? Math.round((Number(completed) / Number(totalAssigned)) * 100) : null;

  return (
    <EmployeeLayout>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Your learning space</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-espresso">Good to see you, {user?.name?.split(' ')[0] || 'learner'}</h1><p className="mt-2 text-sm text-espresso/60">Small steps add up. Pick up where you left off or explore what’s next.</p></div>
        <Link to="/employee/courses" className="inline-flex items-center gap-2 rounded-xl bg-espresso px-4 py-2.5 text-sm font-medium text-white transition hover:bg-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2">My learning <ArrowRight size={16} /></Link>
      </header>

      <section className="mt-7 rounded-2xl bg-espresso p-5 text-white sm:p-7">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[#E8D6B7]"><BookOpen size={17} /> Continue learning</p>
            {coursesQuery.isLoading ? <p className="mt-4 text-sm text-white/65">Finding your courses…</p> : coursesQuery.isError ? <div className="mt-4"><p className="text-sm text-white/80">Your courses could not be loaded right now.</p><button type="button" onClick={coursesQuery.refetch} className="mt-2 text-sm font-medium text-[#E8D6B7] underline">Try again</button></div> : currentCourse ? <>
              <h2 className="mt-3 text-2xl font-semibold">{currentCourse.course?.title || 'Your course'}</h2>
              <p className="mt-2 text-sm text-white/70">{currentCourse.course?.instructor?.name ? `With ${currentCourse.course.instructor.name}` : 'Continue at your own pace'}</p>
              <div className="mt-5 max-w-md"><ProgressBar value={Number.isFinite(Number(currentCourse.progress)) ? Number(currentCourse.progress) : 0} dark /></div>
              <Link to={`/employee/courses/${currentCourse.course?.id}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-espresso transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Continue course <ArrowRight size={16} /></Link>
            </> : !coursesQuery.isLoading && <><h2 className="mt-3 text-xl font-semibold">Ready for your next lesson?</h2><p className="mt-2 text-sm text-white/70">Your assigned courses will show up here when they’re available.</p><Link to="/employee/courses" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20">Browse my learning <ArrowRight size={16} /></Link></>}
          </div>
          <div className="hidden h-28 w-28 place-items-center rounded-full border-white/15 bg-white/5 text-[#E8D6B7] md:grid"><BookOpen size={44} strokeWidth={1.25} aria-hidden="true" /></div>
        </div>
      </section>

      {summaryQuery.isLoading && <LoadingState label="Loading your learning summary…" />}
      {summaryQuery.isError && <ErrorState message="Your learning summary could not be loaded." onRetry={summaryQuery.refetch} />}
      {summaryQuery.isSuccess && summary && <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold text-espresso">Your progress</h2><p className="mt-1 text-sm text-espresso/55">A summary of your assigned learning</p></div>{progress !== null && <span className="text-sm font-semibold text-gold">{progress}% complete</span>}</div>
        {progress !== null && <div className="mt-3 rounded-2xl border-border-warm bg-white p-4"><div className="h-2.5 overflow-hidden rounded-full bg-cream" role="progressbar" aria-label="Overall course completion" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-espresso/55">{format(completed)} of {format(totalAssigned)} assigned courses completed</p></div>}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['assigned', 'To start', BookOpen], ['inProgress', 'In progress', CircleHelp], ['completed', 'Completed', CheckCircle2], ['overdue', 'Overdue', Award]].map(([key, label, Icon]) => <article key={key} className="flex items-center gap-3 rounded-2xl border-border-warm bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream text-gold"><Icon size={17} /></span><div><p className="text-xs text-espresso/55">{label}</p><p className="mt-0.5 text-xl font-semibold text-espresso">{format(summary[key])}</p></div></article>)}</div>
      </section>}

      <section className="mt-8 rounded-2xl border border-border-warm bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-espresso">Deadlines to watch</h2><p className="mt-1 text-sm text-espresso/55">Prioritize work that is overdue or due soon.</p></div><CalendarClock size={19} className="text-gold" /></div>
        {coursesQuery.isLoading && <p className="mt-4 text-sm text-espresso/50">Checking your course deadlines…</p>}
        {coursesQuery.isError && <p className="mt-4 text-sm text-espresso/55">Deadlines are unavailable right now. Retry the course list above.</p>}
        {coursesQuery.isSuccess && deadlines.length === 0 && <p className="mt-4 rounded-xl bg-cream/50 px-4 py-3 text-sm text-espresso/55">No upcoming deadlines on your active courses. Keep your learning momentum going.</p>}
        {coursesQuery.isSuccess && deadlines.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{deadlines.map((item) => {
          const days = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000);
          const timeLabel = item.overdue ? 'Past due' : days <= 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
          return <Link key={item.enrollmentId || item.course?.id} to={`/employee/courses/${item.course?.id}`} className="flex items-start justify-between gap-3 rounded-xl border border-border-warm p-4 transition hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="min-w-0"><p className="truncate text-sm font-semibold text-espresso">{item.course?.title || 'Assigned course'}</p><p className="mt-1 text-xs text-espresso/55">Deadline: {formatDate(item.dueDate)}</p><p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${item.overdue ? 'text-burgundy' : days <= 3 ? 'text-gold' : 'text-espresso/55'}`}><Clock3 size={13} />{timeLabel}</p></div><StatusBadge status={item.status} overdue={item.overdue} /></Link>;
        })}</div>}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-espresso">Your courses</h2><p className="mt-1 text-sm text-espresso/55">Learning assigned to you</p></div><Link to="/employee/courses" className="text-sm font-medium text-gold hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">View all</Link></div>
        {coursesQuery.isLoading && <LoadingState label="Loading your courses…" />}
        {coursesQuery.isError && <ErrorState message="Your course list could not be loaded." onRetry={coursesQuery.refetch} />}
        {coursesQuery.isSuccess && courses.length === 0 && <div className="mt-3 rounded-2xl border-border-warm bg-white"><EmptyState title="No courses assigned yet" description="When your organization assigns learning to you, courses will appear here." /></div>}
        {coursesQuery.isSuccess && courses.length > 0 && <div className="mt-3 grid gap-3 md:grid-cols-2">{courses.slice(0, 4).map((item) => <Link key={item.enrollmentId || item.course?.id} to={`/employee/courses/${item.course?.id}`} className="rounded-2xl border-border-warm bg-white p-4 transition hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-espresso">{item.course?.title || 'Course'}</h3><p className="mt-1 text-xs text-espresso/55">{item.course?.instructor?.name ? `Instructor: ${item.course.instructor.name}` : item.course?.category || 'Assigned learning'}</p></div><StatusBadge status={item.status} overdue={item.overdue} /></div><ProgressBar value={Number.isFinite(Number(item.progress)) ? Number(item.progress) : 0} className="mt-4" /></Link>)}</div>}
      </section>

      <nav className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Learning shortcuts">
        <Shortcut to="/employee/quizzes" icon={CircleHelp} label="Quizzes" detail="Your assessments" />
        <Shortcut to="/employee/learning-paths" icon={Compass} label="Learning paths" detail="Explore a learning route" />
        <Shortcut to="/employee/certificates" icon={Award} label="Certificates" detail="View earned certificates" />
        <Shortcut to="/employee/announcements" icon={Megaphone} label="Announcements" detail="Company learning updates" />
        <Shortcut to="/employee/competencies" icon={Network} label="Competencies" detail="Track your skill development" />
        <Shortcut to="/employee/quiz-history" icon={History} label="Quiz history" detail="Review past attempts and results" />
      </nav>
    </EmployeeLayout>
  );
}

function Shortcut({ to, icon: Icon, label, detail }) {
  return <Link to={to} className="flex items-center gap-3 rounded-2xl border-border-warm bg-white p-4 transition hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-gold"><Icon size={18} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-espresso">{label}</span><span className="mt-0.5 block truncate text-xs text-espresso/55">{detail}</span></span></Link>;
}
