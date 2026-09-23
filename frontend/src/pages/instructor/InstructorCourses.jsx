 import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '../../layouts/InstructorLayout';
import * as courseService from '../../services/courseService';
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '../../components/ui/Primitives';

export default function InstructorCourses() {
  const query = useQuery({ queryKey: ['instructor-courses'], queryFn: () => courseService.listCourses({ limit: 100 }) });
  const courses = query.data?.data || [];
  return <InstructorLayout><h1 className="text-2xl font-semibold text-espresso">My Courses</h1><p className="text-sm text-espresso/60 mt-1">Courses assigned to you for content management and learner support.</p>{query.isLoading && <LoadingState label="Loading courses..." />}{query.isError && <ErrorState message="Unable to load courses." onRetry={query.refetch} />}{query.isSuccess && courses.length === 0 && <EmptyState title="No courses assigned yet." description="Your assigned courses will appear here." />}{query.isSuccess && courses.length > 0 && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">{courses.map((course) => <Link key={course.id} to={`/instructor/courses/${course.id}`} className="bg-white border-border-warm rounded-2xl p-5 hover:border-gold transition"><div className="flex justify-between gap-3"><h2 className="font-medium text-espresso">{course.title}</h2><StatusBadge status={course.status} /></div><p className="text-sm text-espresso/60 mt-3">{course.learnerCount} learners · {course.moduleCount} modules · {course.lessonCount} lessons</p><p className="text-xs text-espresso/40 mt-3">{course.category || 'Uncategorized'} · {course.difficulty}</p></Link>)}</div>}</InstructorLayout>;
}
