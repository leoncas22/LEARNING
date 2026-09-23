import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HrLayout from '../../layouts/HrLayout';
import { listCertificates, revokeCertificate } from '../../services/certificateService';
import {
  StatusBadge,
  SearchInput,
  FilterDropdown,
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
} from '../../components/ui/Primitives';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
];

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Revocation modal state
  const [revokingCert, setRevokingCert] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  async function loadCertificates(page = 1) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCertificates({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setCertificates(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCertificates(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function handleConfirmRevoke(e) {
    e.preventDefault();
    if (!revokingCert) return;

    setIsSubmittingRevoke(true);
    try {
      await revokeCertificate(revokingCert.id, revocationReason);
      setRevokingCert(null);
      setRevocationReason('');
      loadCertificates(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke certificate');
    } finally {
      setIsSubmittingRevoke(false);
    }
  }

  return (
    <HrLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-espresso">Certificates Registry</h1>
            <p className="text-sm text-espresso/60 mt-1">
              View, verify, and govern all awarded employee certificates
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by employee name or certificate number..."
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
          <LoadingState label="Loading certificate registry..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadCertificates(pagination.page)} />
        ) : certificates.length === 0 ? (
          <EmptyState
            title="No certificates found"
            description={search || statusFilter ? 'Try clearing your filters' : 'Certificates are issued automatically as employees fulfill requirements.'}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-border-warm overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-espresso">
                <thead className="bg-cream/50 border-b border-border-warm text-xs uppercase tracking-wider text-espresso/60">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Employee</th>
                    <th className="px-6 py-3 font-semibold">Certification</th>
                    <th className="px-6 py-3 font-semibold">Certificate Number</th>
                    <th className="px-6 py-3 font-semibold">Issued Date</th>
                    <th className="px-6 py-3 font-semibold">Expiration</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-espresso">{cert.user.name}</div>
                        <div className="text-xs text-espresso/50">
                          {cert.user.department?.name || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-espresso">{cert.certification.title}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-espresso/80">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-6 py-4 text-xs text-espresso/70">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs text-espresso/70">
                        {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-espresso hover:text-gold px-2.5 py-1.5 rounded-lg hover:bg-cream transition"
                        >
                          Verify
                        </Link>
                        {cert.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevocationReason('');
                            }}
                            className="text-xs font-medium text-espresso/50 hover:text-burgundy px-2.5 py-1.5 rounded-lg hover:bg-burgundy/10 transition"
                          >
                            Revoke
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
                onChange={(p) => loadCertificates(p)}
              />
            </div>
          </div>
        )}

        {/* Revocation Modal */}
        {revokingCert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-2xl border border-border-warm shadow-xl max-w-md w-full p-6 space-y-4">
              <h2 className="text-lg font-bold text-espresso">Revoke Certificate</h2>
              <p className="text-sm text-espresso/70">
                Are you sure you want to revoke certificate{' '}
                <span className="font-semibold text-espresso">{revokingCert.certificateNumber}</span> for{' '}
                <span className="font-semibold text-espresso">{revokingCert.user.name}</span>?
              </p>
              <p className="text-xs text-espresso/50">
                This will mark the credential as Revoked permanently in public verification records. It will not be deleted.
              </p>

              <form onSubmit={handleConfirmRevoke} className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-espresso/70 mb-1">
                    Revocation Reason (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={revocationReason}
                    onChange={(e) => setRevocationReason(e.target.value)}
                    placeholder="e.g. Policy violation, administrative reissue..."
                    className="w-full rounded-xl border border-border-warm p-3 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRevokingCert(null)}
                    disabled={isSubmittingRevoke}
                    className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRevoke}
                    className="px-4 py-2 rounded-xl bg-burgundy text-white text-sm font-medium hover:bg-burgundy/90 transition"
                  >
                    {isSubmittingRevoke ? 'Revoking...' : 'Confirm Revocation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </HrLayout>
  );
}

