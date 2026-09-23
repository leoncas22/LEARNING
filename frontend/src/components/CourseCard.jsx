import { Link } from 'react-router-dom';
import { StatusBadge } from './ui/Primitives';

export function CourseCard({ course }) {
  return (
    <Link
      to={`/hr/courses/${course.id}`}
      className="block bg-white border border-border-warm rounded-2xl overflow-hidden hover:shadow-md transition group"
    >
      <div className="aspect-[16/9] bg-cream flex items-center justify-center overflow-hidden">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-espresso/20 text-3xl font-semibold">{course.title?.charAt(0)}</span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-espresso group-hover:text-gold transition line-clamp-2">{course.title}</h3>
          <StatusBadge status={course.status} />
        </div>
        <p className="text-xs text-espresso/50 mt-1">
          {course.category} · {course.difficulty?.charAt(0) + course.difficulty?.slice(1).toLowerCase()}
        </p>
        <div className="flex items-center justify-between mt-4 text-xs text-espresso/60">
          <span>{course.instructor?.name || 'No instructor'}</span>
          <span>{course.lessonCount} lessons</span>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs text-espresso/40">
          <span>{course.learnerCount} learners</span>
          <span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}

export default CourseCard;
