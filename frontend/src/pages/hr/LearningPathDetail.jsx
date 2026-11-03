import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import HrLayout from "../../layouts/HrLayout";
import * as pathService from "../../services/learningPathService";
import * as courseService from "../../services/courseService";
import * as employeeService from "../../services/employeeService";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  ProgressBar,
  useConfirm,
} from "../../components/ui/Primitives";

const inputClass =
  "w-full rounded-xl border-border-warm bg-white px-3 py-2.5 text-sm text-espresso";

export default function LearningPathDetail() {
  const { id } = useParams();
  const client = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [courseId, setCourseId] = useState("");
  const [targetType, setTargetType] = useState("EMPLOYEE");
  const [targetId, setTargetId] = useState("");
  const [employeeIds, setEmployeeIds] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pathQuery = useQuery({
    queryKey: ["learning-path", id],
    queryFn: () => pathService.getPath(id),
  });
  const courseQuery = useQuery({
    queryKey: ["courses", "path-options"],
    queryFn: () =>
      courseService.listCourses({ limit: 100, status: "PUBLISHED" }),
  });
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: () =>
      employeeService.listEmployees({
        role: "EMPLOYEE",
        status: "ACTIVE",
        limit: 100,
      }),
  });
  const progressQuery = useQuery({
    queryKey: ["learning-path-progress", id],
    queryFn: () => pathService.listProgress(id, { limit: 50 }),
    enabled: Boolean(id),
  });
  const path = pathQuery.data;
  const courses = courseQuery.data?.data || [];
  const employees = useMemo(
    () => employeesQuery.data?.data || [],
    [employeesQuery.data],
  );
  const departments = useMemo(
    () => [
      ...new Map(
        employees
          .filter((e) => e.department)
          .map((e) => [e.department.id, e.department]),
      ).values(),
    ],
    [employees],
  );
  const positions = useMemo(
    () => [
      ...new Map(
        employees
          .filter((e) => e.position)
          .map((e) => [e.position.id, e.position]),
      ).values(),
    ],
    [employees],
  );
  function refresh() {
    client.invalidateQueries({ queryKey: ["learning-path", id] });
    client.invalidateQueries({ queryKey: ["learning-path-progress", id] });
    client.invalidateQueries({ queryKey: ["learning-paths"] });
    client.invalidateQueries({ queryKey: ["my-learning-paths"] });
    client.invalidateQueries({ queryKey: ["my-courses"] });
    client.invalidateQueries({ queryKey: ["notifications"] });
  }
  const add = useMutation({
    mutationFn: () => pathService.addCourse(id, { courseId, required: true }),
    onSuccess: () => {
      setCourseId("");
      setError("");
      setNotice("Course added to the learning path.");
      refresh();
    },
    onError: (e) =>
      setError(e.response?.data?.message || "Unable to add course."),
  });
  const remove = useMutation({
    mutationFn: (course) => pathService.removeCourse(id, course.id),
    onSuccess: () => {
      setError("");
      setNotice("Course removed from the learning path.");
      refresh();
    },
    onError: (e) =>
      setError(e.response?.data?.message || "Unable to remove course."),
  });
  const reorder = useMutation({
    mutationFn: (courseIds) => pathService.reorderCourses(id, courseIds),
    onSuccess: () => {
      setError("");
      setNotice("Course order updated.");
      refresh();
    },
    onError: (e) =>
      setError(e.response?.data?.message || "Unable to reorder courses."),
  });
  const assign = useMutation({
    mutationFn: () =>
      pathService.assignPath(
        id,
        targetType === "EMPLOYEE"
          ? { employeeIds, dueDate: dueDate || undefined }
          : {
              [`${targetType.toLowerCase()}Id`]: targetId,
              dueDate: dueDate || undefined,
            },
      ),
    onSuccess: () => {
      setTargetId("");
      setEmployeeIds([]);
      setError("");
      setNotice("Learning path assignment completed.");
      refresh();
    },
    onError: (e) =>
      setError(e.response?.data?.message || "Unable to assign learning path."),
  });
  const status = useMutation({
    mutationFn: (action) =>
      action === "publish"
        ? pathService.publishPath(id)
        : pathService.archivePath(id),
    onSuccess: () => {
      setError("");
      setNotice("Learning path status updated.");
      refresh();
    },
    onError: (e) =>
      setError(e.response?.data?.message || "Unable to change path status."),
  });
  function move(index, direction) {
    const next = [...path.courses];
    const swap = index + direction;
    if (swap < 0 || swap >= next.length || reorder.isPending) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setError("");
    setNotice("");
    reorder.mutate(next.map((c) => c.id));
  }
  async function confirmRemoveCourse(course) {
    const accepted = await confirm({
      title: `Remove ${course.title}?`,
      description: "Learner progress for this course will no longer count toward this learning path.",
      confirmLabel: "Remove course",
      danger: true,
    });
    if (accepted) {
      setError("");
      setNotice("");
      remove.mutate(course);
    }
  }
  if (pathQuery.isLoading)
    return (
      <HrLayout>
        <LoadingState label="Loading learning path..." />
      </HrLayout>
    );
  if (pathQuery.isError || !path)
    return (
      <HrLayout>
        <ErrorState
          message="Unable to load this learning path."
          onRetry={pathQuery.refetch}
        />
      </HrLayout>
    );
  const available = courses.filter(
    (course) => !path.courses.some((item) => item.id === course.id),
  );
  return (
    <HrLayout>
      {dialog}
      <div className="space-y-6">
        <Link to="/hr/learning-paths" className="text-sm text-gold">
          ← Back to learning paths
        </Link>
        <section className="bg-white border-border-warm rounded-2xl p-6">
          <div className="flex justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-espresso">
                {path.title}
              </h1>
              <p className="text-sm text-espresso/60 mt-1">
                {path.description || "No description"}
              </p>
              <p className="text-xs text-espresso/40 mt-3">
                Created {new Date(path.createdAt).toLocaleDateString()}{" "}
                {path.publishedAt
                  ? `· Published ${new Date(path.publishedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            <StatusBadge status={path.status} />
          </div>
          <div className="flex gap-3 mt-5">
            {path.status === "DRAFT" && (
              <button
                type="button"
                disabled={status.isPending}
                onClick={() => {
                  setError("");
                  setNotice("");
                  status.mutate("publish");
                }}
                className="px-4 py-2 rounded-xl bg-espresso text-white text-sm disabled:opacity-50"
              >
                {status.isPending ? "Publishing..." : "Publish"}
              </button>
            )}
            {path.status === "PUBLISHED" && (
              <button
                type="button"
                disabled={status.isPending}
                onClick={async () => {
                  const accepted = await confirm({
                    title: "Archive this learning path?",
                    description: "Archived paths can no longer be assigned to new learners.",
                    confirmLabel: "Archive path",
                    danger: true,
                  });
                  if (!accepted) return;
                  setError("");
                  setNotice("");
                  status.mutate("archive");
                }}
                className="px-4 py-2 rounded-xl border-burgundy/30 text-burgundy text-sm disabled:opacity-50"
              >
                {status.isPending ? "Archiving..." : "Archive"}
              </button>
            )}
          </div>
        </section>
        {error && (
          <p className="text-sm text-burgundy" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-emerald-700" role="status">
            {notice}
          </p>
        )}
        <section className="bg-white border-border-warm rounded-2xl p-5">
          <h2 className="font-semibold text-espresso">Courses in this path</h2>
          {path.courses.length === 0 ? (
            <EmptyState title="No courses in this learning path." />
          ) : (
            <div className="mt-4 space-y-2">
              {path.courses.map((course, index) => (
                <div
                  key={course.id}
                  className="flex items-center gap-3 border-border-warm rounded-xl px-4 py-3"
                >
                  <span className="text-xs text-espresso/40 w-5">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-espresso">{course.title}</p>
                    <p className="text-xs text-espresso/50">
                      {course.required ? "Required" : "Optional"} ·{" "}
                      {course.category || "Uncategorized"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Move ${course.title} up`}
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || reorder.isPending}
                    className="rounded px-2 py-1 text-xs text-espresso/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${course.title} down`}
                    onClick={() => move(index, 1)}
                    disabled={
                      index === path.courses.length - 1 || reorder.isPending
                    }
                    className="rounded px-2 py-1 text-xs text-espresso/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={remove.isPending}
                    onClick={() => confirmRemoveCourse(course)}
                    className="text-xs text-burgundy disabled:opacity-50"
                  >
                    {remove.isPending ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className={inputClass}
            >
              <option value="">Add existing published course</option>
              {available.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!courseId || add.isPending}
              onClick={() => {
                setError("");
                setNotice("");
                add.mutate();
              }}
              className="px-4 py-2 rounded-xl bg-espresso text-white text-sm"
            >
              Add
            </button>
          </div>
        </section>
        <section className="bg-white border-border-warm rounded-2xl p-5">
          <h2 className="font-semibold text-espresso">Assign program</h2>
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setTargetId("");
              }}
              className={inputClass}
              disabled={assign.isPending}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="DEPARTMENT">Department</option>
              <option value="POSITION">Position</option>
            </select>
            {targetType === "EMPLOYEE" ? (
              <select
                value={employeeIds[0] || ""}
                onChange={(e) =>
                  setEmployeeIds(e.target.value ? [e.target.value] : [])
                }
                className={inputClass}
                disabled={assign.isPending}
              >
                <option value="">Select employee</option>
                {employees
                  .filter((e) => e.role?.name === "EMPLOYEE")
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            ) : (
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className={inputClass}
                disabled={assign.isPending}
              >
                <option value="">Select {targetType.toLowerCase()}</option>
                {(targetType === "DEPARTMENT" ? departments : positions).map(
                  (item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ),
                )}
              </select>
            )}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
              disabled={assign.isPending}
            />
          </div>
          <button
            type="button"
            disabled={
              assign.isPending ||
              (targetType === "EMPLOYEE" ? !employeeIds.length : !targetId)
            }
            onClick={() => {
              setError("");
              setNotice("");
              assign.mutate();
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-espresso text-white text-sm"
          >
            {assign.isPending ? "Assigning..." : "Assign learning path"}
          </button>
        </section>
        <section className="bg-white border-border-warm rounded-2xl p-5">
          <h2 className="font-semibold text-espresso">Assignment progress</h2>
          {progressQuery.isLoading && (
            <LoadingState label="Loading progress..." />
          )}
          {progressQuery.isError && (
            <ErrorState
              message="Unable to load progress."
              onRetry={progressQuery.refetch}
            />
          )}
          {progressQuery.isSuccess && progressQuery.data.length === 0 && (
            <EmptyState title="No employees assigned." />
          )}
          {progressQuery.isSuccess && progressQuery.data.length > 0 && (
            <div className="mt-4 space-y-3">
              {progressQuery.data.map((row) => (
                <div
                  key={row.assignmentId}
                  className="border border-border-warm rounded-xl p-4"
                >
                  <div className="flex justify-between">
                    <p className="font-medium text-espresso">{row.user.name}</p>
                    <span className="text-sm text-espresso/60">
                      {row.status}
                    </span>
                  </div>
                  <ProgressBar value={row.progress} />
                  <p className="text-xs text-espresso/50 mt-2">
                    {row.completedCourses} of {row.totalCourses} courses
                    completed
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </HrLayout>
  );
}
