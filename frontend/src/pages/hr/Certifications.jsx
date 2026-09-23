import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HrLayout from '../../layouts/HrLayout';
import { listCertifications, archiveCertification } from '../../services/certificationService';
import {
  StatusBadge,
  SearchInput,
  FilterDropdown,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
  useConfirm,
} from '../../components/ui/Primitives';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export default function Certifications() {
  const [certifications, setCertifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { confirm, dialog } = useConfirm();

  async function loadCertifications(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCertifications({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setCertifications(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load certifications');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCertifications(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function handleArchive(cert) {
    const confirmed = await confirm({
      title: 'Archive Certification',
      description: `Are you sure you want to archive "${cert.title}"? No new certificates will be automatically issued.`,
      confirmLabel: 'Archive',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await archiveCertification(cert.id);
      loadCertifications(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive certification');
    }
  }

  return (
    <HrLayout>
      {dialog}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-espresso">Certifications</h1>
            <p className="text-sm text-espresso/60 mt-1">
              Define training completion requirements and manage official credentials
            </p>
          </div>
          <Link
            to="/hr/certifications/create"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition shadow-sm"
          >
            + Create Certification
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search certifications by name..."
            />
          </div>
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState label="Loading certifications..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadCertifications(pagination.page)} />
        ) : certifications.length === 0 ? (
          <EmptyState
            title="No certifications found"
            description={search || statusFilter ? 'Try clearing filters' : 'Create your first certification to start awarding credentials.'}
            action={
              !search && !statusFilter ? (
                <Link
                  to="/hr/certifications/create"
                  className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium"
                >
                  Create Certification
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
                    <th className="px-6 py-3 font-semibold">Certification</th>
                    <th className="px-6 py-3 font-semibold">Required Course</th>
                    <th className="px-6 py-3 font-semibold">Requirements</th>
                    <th className="px-6 py-3 font-semibold">Issued</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {certifications.map((cert) => (
                    <tr key={cert.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4">
                        <Link
                          to={`/hr/certifications/${cert.id}`}
                          className="font-medium text-espresso hover:text-gold transition block"
                        >
                          {cert.title}
                        </Link>
                        {cert.validityDays ? (
                          <span className="text-xs text-espresso/50">Valid for {cert.validityDays} days</span>
                        ) : (
                          <span className="text-xs text-espresso/40">Never expires</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-espresso/80">
                        {cert.course?.title || <span className="text-espresso/40">None attached</span>}
                      </td>
                      <td className="px-6 py-4 text-xs text-espresso/70 space-y-0.5">
                        {cert.requirements ? (
                          <>
                            {cert.requirements.minProgressPct !== null && (
                              <div>Course: {cert.requirements.minProgressPct}%</div>
                            )}
                            {cert.requirements.quiz && (
                              <div>
                                Quiz: &ge; {cert.requirements.minQuizScore || cert.requirements.quiz.passingScore}%
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-espresso/40">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-espresso">
                        {cert.certificatesIssued}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/hr/certifications/${cert.id}`}
                          className="text-xs font-medium text-espresso hover:text-gold px-2.5 py-1.5 rounded-lg hover:bg-cream transition"
                        >
                          View
                        </Link>
                        {cert.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() => handleArchive(cert)}
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
                onChange={(p) => loadCertifications(p)}
              />
            </div>
          </div>
        )}
      </div>
    </HrLayout>
  );
}

