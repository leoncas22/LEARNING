import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import HrLayout from "../../layouts/HrLayout";
import {
  getCompetency,
  archiveCompetency,
} from "../../services/competencyService";
import {
  StatusBadge,
  LoadingState,
  ErrorState,
  useConfirm,
} from "../../components/ui/Primitives";

export default function CompetencyDetail() {
  const { id } = useParams();
  const [competency, setCompetency] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  const { confirm, dialog } = useConfirm();

  async function loadDetail() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCompetency(id);
      setCompetency(data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load competency details",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function handleArchive() {
    const confirmed = await confirm({
      title: "Archive Competency",
      description: "Are you sure you want to archive this competency?",
      confirmLabel: "Archive",
      danger: true,
    });
    if (!confirmed || isArchiving) return;
    setIsArchiving(true);
    setActionError("");
    try {
      await archiveCompetency(id);
      await loadDetail();
    } catch (err) {
      setActionError(
        err.response?.data?.message || "Failed to archive competency.",
      );
    } finally {
      setIsArchiving(false);
    }
  }

  if (isLoading) {
    return (
      <HrLayout>
        <LoadingState label="Loading competency details..." />
      </HrLayout>
    );
  }

  if (error || !competency) {
    return (
      <HrLayout>
        <ErrorState
          message={error || "Competency not found"}
          onRetry={loadDetail}
        />
      </HrLayout>
    );
  }

  const { levels, courseCompetencies, employeeCompetencies } = competency;

  return (
    <HrLayout>
      {dialog}
      <div className="space-y-6">
        {actionError && (
          <p className="text-sm text-burgundy" role="alert">
            {actionError}
          </p>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to="/hr/competencies"
              className="text-xs font-medium text-gold hover:underline"
            >
              &larr; Back to Competencies
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-espresso">
                {competency.name}
              </h1>
              <StatusBadge status={competency.status} />
              {competency.category && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-cream border border-border-warm font-medium text-espresso/70">
                  {competency.category}
                </span>
              )}
            </div>
            <p className="text-sm text-espresso/60 mt-1 max-w-2xl">
              {competency.description || "No description provided."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {competency.status !== "ARCHIVED" && (
              <button
                type="button"
                onClick={handleArchive}
                disabled={isArchiving}
                className="px-3.5 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso/70 hover:text-burgundy hover:bg-burgundy/10 transition"
              >
                Archive
              </button>
            )}
          </div>
        </div>

        {/* Levels Grid */}
        <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-espresso">
            Proficiency Standards & Score Bands
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {levels?.map((lvl) => (
              <div
                key={lvl.level}
                className="p-4 rounded-xl border border-border-warm/70 bg-cream/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-espresso">
                    {lvl.level}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-border-warm font-semibold text-espresso/80">
                    {lvl.minScore}–{lvl.maxScore}%
                  </span>
                </div>
                <p className="text-xs text-espresso/60 leading-relaxed">
                  {lvl.description || "No description defined."}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contributing Courses & Employees Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linked Courses */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-border-warm p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-espresso">
              Contributing Courses ({courseCompetencies?.length || 0})
            </h2>
            <p className="text-xs text-espresso/50">
              Courses that develop and evaluate this competency
            </p>

            {!courseCompetencies || courseCompetencies.length === 0 ? (
              <p className="text-xs text-espresso/40 py-4 text-center">
                No courses linked yet. Assign this competency from course
                settings.
              </p>
            ) : (
              <div className="divide-y divide-border-warm/60">
                {courseCompetencies.map((cc) => (
                  <div
                    key={cc.id}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <Link
                        to={`/hr/courses/${cc.course.id}`}
                        className="text-xs font-medium text-espresso hover:text-gold transition block"
                      >
                        {cc.course.title}
                      </Link>
                      <span className="text-[11px] text-espresso/50">
                        Target:{" "}
                        <span className="font-semibold text-espresso">
                          {cc.targetLevel}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Achieved Employees */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border-warm overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border-warm">
              <h2 className="text-base font-semibold text-espresso">
                Achieved Employees ({employeeCompetencies?.length || 0})
              </h2>
            </div>

            {!employeeCompetencies || employeeCompetencies.length === 0 ? (
              <div className="text-center py-12 px-4 text-sm text-espresso/50">
                No employees have earned this competency yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-espresso">
                  <thead className="bg-cream/50 border-b border-border-warm text-xs uppercase tracking-wider text-espresso/60">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Employee</th>
                      <th className="px-6 py-3 font-semibold">Department</th>
                      <th className="px-6 py-3 font-semibold">Level</th>
                      <th className="px-6 py-3 font-semibold">Score</th>
                      <th className="px-6 py-3 font-semibold">Achieved Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm/60">
                    {employeeCompetencies.map((ec) => (
                      <tr key={ec.id} className="hover:bg-cream/20 transition">
                        <td className="px-6 py-3.5 font-medium text-espresso">
                          {ec.user.name}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-espresso/60">
                          {ec.user.department?.name || "General"}
                        </td>
                        <td className="px-6 py-3.5">
                          <StatusBadge status={ec.level} />
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-espresso">
                          {ec.score}%
                        </td>
                        <td className="px-6 py-3.5 text-xs text-espresso/70">
                          {new Date(ec.achievedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </HrLayout>
  );
}
