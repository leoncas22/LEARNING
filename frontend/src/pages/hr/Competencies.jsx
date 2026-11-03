import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HrLayout from "../../layouts/HrLayout";
import {
  listCompetencies,
  archiveCompetency,
} from "../../services/competencyService";
import {
  StatusBadge,
  SearchInput,
  FilterDropdown,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
  useConfirm,
} from "../../components/ui/Primitives";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function Competencies() {
  const [competencies, setCompetencies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const { confirm, dialog } = useConfirm();

  async function loadCompetencies(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCompetencies({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setCompetencies(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load competencies");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCompetencies(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function handleArchive(comp) {
    const confirmed = await confirm({
      title: "Archive Competency",
      description: `Are you sure you want to archive "${comp.name}"?`,
      confirmLabel: "Archive",
      danger: true,
    });
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await archiveCompetency(comp.id);
      setNotice("Competency archived.");
      await loadCompetencies(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to archive competency.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <HrLayout>
      {dialog}
      <div className="space-y-6">
        {notice && (
          <p className="text-sm text-emerald-700" role="status">
            {notice}
          </p>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-espresso">Competencies</h1>
            <p className="text-sm text-espresso/60 mt-1">
              Define enterprise skills, set proficiency standards, and track
              employee growth
            </p>
          </div>
          <Link
            to="/hr/competencies/create"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition shadow-sm"
          >
            + Create Competency
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search competencies by name or category..."
            />
          </div>
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Table / Content */}
        {isLoading ? (
          <LoadingState label="Loading competencies..." />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => loadCompetencies(pagination.page)}
          />
        ) : competencies.length === 0 ? (
          <EmptyState
            title="No competencies defined"
            description={
              search || statusFilter
                ? "Try clearing filters"
                : "Create competencies to link learning outcomes with measurable skills."
            }
            action={
              !search && !statusFilter ? (
                <Link
                  to="/hr/competencies/create"
                  className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium"
                >
                  Create Competency
                </Link>
              ) : null
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-border-warm overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-espresso">
                <thead className="bg-cream/50 border-b border-border-warm text-xs uppercase tracking-wider text-espresso/60">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Competency</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Linked Courses</th>
                    <th className="px-6 py-3 font-semibold">
                      Employees Achieved
                    </th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {competencies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4">
                        <Link
                          to={`/hr/competencies/${comp.id}`}
                          className="font-medium text-espresso hover:text-gold transition block"
                        >
                          {comp.name}
                        </Link>
                        {comp.description && (
                          <p className="text-xs text-espresso/50 truncate max-w-xs">
                            {comp.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-espresso/70">
                        {comp.category ? (
                          <span className="px-2.5 py-1 rounded-lg bg-cream border border-border-warm/60">
                            {comp.category}
                          </span>
                        ) : (
                          <span className="text-espresso/40">
                            Uncategorized
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-espresso">
                        {comp.courseCount || 0}
                      </td>
                      <td className="px-6 py-4 font-medium text-espresso">
                        {comp.employeeCount || 0}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={comp.status} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/hr/competencies/${comp.id}`}
                          className="text-xs font-medium text-espresso hover:text-gold px-2.5 py-1.5 rounded-lg hover:bg-cream transition"
                        >
                          View
                        </Link>
                        {comp.status !== "ARCHIVED" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(comp)}
                            disabled={busy}
                            className="text-xs font-medium text-espresso/50 hover:text-burgundy px-2.5 py-1.5 rounded-lg hover:bg-burgundy/10 transition"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border-warm">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onChange={(p) => loadCompetencies(p)}
              />
            </div>
          </div>
        )}
      </div>
    </HrLayout>
  );
}
