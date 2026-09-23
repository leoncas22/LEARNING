import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import * as pathService from '../../services/learningPathService';
import { EmptyState, ErrorState, LoadingState, ProgressBar, StatusBadge } from '../../components/ui/Primitives';

export default function LearningPaths() {
  const query = useQuery({ queryKey: ['my-learning-paths'], queryFn: pathService.listMyPaths });
  return <EmployeeLayout><h1 className="text-2xl font-semibold text-espresso">Learning Paths</h1><p className="text-sm text-espresso/60 mt-1">Your assigned training programs.</p>{query.isLoading && <LoadingState label="Loading learning paths..." />}{query.isError && <ErrorState message="Unable to load learning paths." onRetry={query.refetch} />}{query.isSuccess && query.data.length === 0 && <EmptyState title="No learning paths assigned." description="Assigned programs will appear here." />}{query.isSuccess && query.data.length > 0 && <div className="grid md:grid-cols-2 gap-5 mt-6">{query.data.map((path) => <Link key={path.id} to={`/employee/learning-paths/${path.id}`} className="bg-white border-border-warm rounded-2xl p-5 hover:border-gold transition"><div className="flex justify-between gap-3"><h2 className="font-semibold text-espresso">{path.title}</h2><StatusBadge status={path.status} /></div><p className="text-sm text-espresso/60 mt-2">{path.description || 'Structured learning program'}</p><ProgressBar value={path.progress} className="mt-5" /><p className="text-xs text-espresso/50 mt-3">{path.completedCourses} of {path.totalCourses} courses completed</p></Link>)}</div>}</EmployeeLayout>;
}
