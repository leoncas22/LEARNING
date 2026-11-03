import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import * as pathService from "../../services/learningPathService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatusBadge,
} from "../../components/ui/Primitives";

export default function LearningPathDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["my-learning-path", id],
    queryFn: () => pathService.getMyPath(id),
  });
  if (query.isLoading)
    return (
      <EmployeeLayout>
        <LoadingState label="Loading learning path..." />
      </EmployeeLayout>
    );
  if (query.isError)
    return (
      <EmployeeLayout>
        <ErrorState
          message="Unable to load this learning path."
          onRetry={query.refetch}
        />
      </EmployeeLayout>
    );
  const response = query.data?.data || query.data;
  const data = response.assignment || response;
  const learningPath = data.learningPath || response.learningPath || data;
  const courses = data.courses || [];
  const pathProgress = data.progress ?? learningPath.progress ?? 0;
  const completedCourses =
    data.completedCourses ?? learningPath.completedCourses ?? 0;
  const totalCourses =
    data.totalCourses ?? learningPath.totalCourses ?? courses.length;
  return (
    <EmployeeLayout>
      <Link to="/employee/learning-paths" className="text-sm text-gold">
        ← Back to learning paths
      </Link>
      <div className="mt-3 bg-white border-border-warm rounded-2xl p-6">
        <div className="flex justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-espresso">
              {learningPath.title}
            </h1>
            <p className="text-sm text-espresso/60 mt-1">
              {learningPath.description || "Structured learning program"}
            </p>
          </div>
          <StatusBadge
            status={
              learningPath.status ||
              (pathProgress > 0 ? "IN_PROGRESS" : "ASSIGNED")
            }
          />
        </div>
        <ProgressBar value={pathProgress} className="mt-6" />
        <p className="text-xs text-espresso/50 mt-3">
          {completedCourses} of {totalCourses} courses completed
        </p>
      </div>
      <div className="mt-6 space-y-3">
        {courses.length ? (
          courses.map((course, index) => (
            <div
              key={course.id}
              className="bg-white border-border-warm rounded-xl px-4 py-4 flex items-center gap-3"
            >
              <span className="text-xs text-espresso/40">{index + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-espresso">{course.title}</p>
                <p className="text-xs text-espresso/50">
                  {course.required ? "Required" : "Optional"}
                </p>
              </div>
              <StatusBadge
                status={
                  course.status ||
                  (course.progress >= 100 ? "COMPLETED" : "ASSIGNED")
                }
              />
              {course.id && (
                <Link
                  to={`/employee/courses/${course.id}`}
                  className="text-sm text-gold hover:underline"
                >
                  Open course
                </Link>
              )}
            </div>
          ))
        ) : (
          <EmptyState title="No courses in this learning path." />
        )}
      </div>
    </EmployeeLayout>
  );
}
