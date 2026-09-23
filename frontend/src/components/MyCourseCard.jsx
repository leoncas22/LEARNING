import { Link } from 'react-router-dom';
import { ProgressBar, StatusBadge } from './ui/Primitives';

export function MyCourseCard({ enrollment }) {
  const { course, progress, dueDate, status, overdue } = enrollment;
  return (
    <div className="bg-white border border-border-warm rounded-2xl overflow-hidden">
      <div className="aspect-[16/9] bg-cream flex items-center justify-center overflow-hidden">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-espresso/20 text-3xl font-semibold">{course.title?.charAt(0)}</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-espresso">{course.title}</h3>
          <StatusBadge status={status} overdue={overdue} />
        </div>
        <p className="text-xs text-espresso/50 mt-1">{course.instructor?.name}</p>
        <div className="mt-4">
          <ProgressBar value={progress} />
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-espresso/50">{dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : 'No due date'}</span>
          <Link
            to={`/employee/courses/${course.id}`}
            className="px-3 py-1.5 rounded-lg bg-espresso text-cream text-xs font-medium hover:bg-espresso/90 transition"
          >
            {status === 'COMPLETED' ? 'Review' : 'Continue Learning'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MyCourseCard;
