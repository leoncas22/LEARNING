import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import InstructorLayout from '../../layouts/InstructorLayout';
import * as courseService from '../../services/courseService';
import * as instructorService from '../../services/instructorService';
import { LoadingState, ErrorState, EmptyState, StatusBadge, ProgressBar } from '../../components/ui/Primitives';

export default function InstructorLearners() {
  const [courseId, setCourseId] = useState('');
  const coursesQuery = useQuery({ queryKey: ['instructor-courses'], queryFn: () => courseService.listCourses({ limit: 100 }) });
  const courses = coursesQuery.data?.data || [];
  const learnersQuery = useQuery({ queryKey: ['instructor-learners', courseId], queryFn: () => instructorService.listLearners(courseId, { limit: 50 }), enabled: Boolean(courseId) });
  const learners = learnersQuery.data?.data || [];
  return <InstructorLayout>
    <h1 className="text-2xl font-semibold text-espresso">Learner Monitoring</h1>
    <p className="text-sm text-espresso/60 mt-1">Review progress for learners enrolled in your assigned courses.</p>
    <div className="mt-6 max-w-md"><label className="block text-sm font-medium text-espresso mb-1.5" htmlFor="learner-course">Course</label><select id="learner-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full rounded-xl border-border-warm bg-white px-4 py-2.5 text-espresso"><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></div>
    {coursesQuery.isLoading && <LoadingState label="Loading courses..." />}
    {coursesQuery.isError && <ErrorState message="Unable to load courses." onRetry={coursesQuery.refetch} />}
    {!courseId && coursesQuery.isSuccess && <EmptyState title="Select a course to view learners." description="Only learners enrolled in your assigned courses are shown." />}
    {courseId && learnersQuery.isLoading && <LoadingState label="Loading learners..." />}
    {courseId && learnersQuery.isError && <ErrorState message="Unable to load learners." onRetry={learnersQuery.refetch} />}
    {courseId && learnersQuery.isSuccess && learners.length === 0 && <EmptyState title="No learners enrolled." description="Learner progress will appear when employees are assigned to this course." />}
    {courseId && learnersQuery.isSuccess && learners.length > 0 && <div className="mt-6 overflow-x-auto border-border-warm rounded-2xl bg-white"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-espresso/50 uppercase tracking-wide border-b border-border-warm"><th className="px-5 py-3">Learner</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Due</th></tr></thead><tbody className="divide-y divide-border-warm/60">{learners.map((row) => <tr key={row.enrollmentId}><td className="px-5 py-4"><p className="font-medium text-espresso">{row.user.name}</p><p className="text-xs text-espresso/50">{row.user.email}</p></td><td className="px-5 py-4"><StatusBadge status={row.status} overdue={row.overdue} /></td><td className="px-5 py-4 min-w-[180px]"><ProgressBar value={row.progress} /></td><td className="px-5 py-4 text-espresso/60">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>}
    <Link to="/instructor/courses" className="inline-block mt-6 text-sm text-gold hover:underline">← Back to my courses</Link>
  </InstructorLayout>;
}
