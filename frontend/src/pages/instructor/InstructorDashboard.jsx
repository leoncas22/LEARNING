import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '../../layouts/InstructorLayout';
import * as instructorService from '../../services/instructorService';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components/ui/Primitives';

const metrics = [
  ['assignedCourses', 'Assigned courses'], ['publishedCourses', 'Published courses'], ['totalLearners', 'Learners'],
  ['activeLearners', 'Active learners'], ['completedLearners', 'Completed learners'], ['averageQuizScore', 'Average quiz score'],
];

export default function InstructorDashboard() {
  const query = useQuery({ queryKey: ['instructor-dashboard'], queryFn: instructorService.getDashboard });
  const dashboard = query.data?.data;
  return <InstructorLayout>
    <h1 className="text-2xl font-semibold text-espresso">Instructor Dashboard</h1>
    <p className="text-sm text-espresso/60 mt-1">Monitor your assigned learning content and learner activity.</p>
    {query.isLoading && <LoadingState label="Loading instructor workspace..." />}
    {query.isError && <ErrorState message="Unable to load your instructor dashboard." onRetry={query.refetch} />}
    {query.isSuccess && dashboard && <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {metrics.map(([key, label]) => <div key={key} className="bg-white border-border-warm rounded-2xl p-5"><p className="text-xs uppercase tracking-wide text-espresso/50">{label}</p><p className="text-2xl font-semibold text-espresso mt-2">{dashboard.metrics[key]}{key === 'averageQuizScore' ? '%' : ''}</p></div>)}
      </div>
      <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-semibold text-espresso">My courses</h2><Link to="/instructor/courses" className="text-sm text-gold hover:underline">View all</Link></div>
      {dashboard.courses.length === 0 ? <EmptyState title="No courses assigned yet." description="Courses assigned to you will appear here." /> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{dashboard.courses.slice(0, 6).map((course) => <Link key={course.id} to={`/instructor/courses/${course.id}`} className="bg-white border-border-warm rounded-2xl p-5 hover:border-gold transition"><div className="flex justify-between gap-3"><h3 className="font-medium text-espresso">{course.title}</h3><StatusBadge status={course.status} /></div><p className="text-sm text-espresso/60 mt-3">{course.learnerCount} learners · {course.moduleCount} modules · {course.quizCount} quizzes</p></Link>)}</div>}
    </>}
  </InstructorLayout>;
}
