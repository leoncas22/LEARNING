import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import HrLayout from '../../layouts/HrLayout';
import { getCertification, archiveCertification } from '../../services/certificationService';
import { StatusBadge, LoadingState, ErrorState, useConfirm } from '../../components/ui/Primitives';

export default function CertificationDetail() {
  const { id } = useParams();
  const [certification, setCertification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { confirm, dialog } = useConfirm();

  async function loadDetail() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCertification(id);
      setCertification(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load certification details');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [id]);

  async function handleArchive() {
    const confirmed = await confirm({
      title: 'Archive Certification',
      description: 'Are you sure you want to archive this certification? New certificates will not be automatically issued.',
      confirmLabel: 'Archive',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await archiveCertification(id);
      loadDetail();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive');
    }
  }

  if (isLoading) {
    return (
      <HrLayout>
        <LoadingState label="Loading certification details..." />
      </HrLayout>
    );
  }

  if (error || !certification) {
    return (
      <HrLayout>
        <ErrorState message={error || 'Certification not found'} onRetry={loadDetail} />
      </HrLayout>
    );
  }

  const { stats, requirement, course, certificates } = certification;

  return (
    <HrLayout>
      {dialog}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link to="/hr/certifications" className="text-xs font-medium text-gold hover:underline">
              &larr; Back to Certifications
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-espresso">{certification.title}</h1>
              <StatusBadge status={certification.status} />
            </div>
            <p className="text-sm text-espresso/60 mt-1 max-w-2xl">
              {certification.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {certification.status !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleArchive}
                className="px-3.5 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso/70 hover:text-burgundy hover:bg-burgundy/10 transition"
              >
                Archive
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-espresso/50">Total Issued</p>
            <p className="text-2xl font-bold text-espresso mt-1">{stats?.totalIssued || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-espresso/50">Active</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats?.active || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-espresso/50">Expired</p>
            <p className="text-2xl font-bold text-slate-500 mt-1">{stats?.expired || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-espresso/50">Revoked</p>
            <p className="text-2xl font-bold text-burgundy mt-1">{stats?.revoked || 0}</p>
          </div>
        </div>

        {/* Criteria & Requirements Card */}
        <div className="bg-white rounded-2xl border border-border-warm p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-espresso">Certification Requirements</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60">
              <p className="text-xs font-medium text-espresso/50 uppercase">Associated Course</p>
              <p className="font-medium text-espresso mt-1">{course?.title || 'None'}</p>
            </div>
            <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60">
              <p className="text-xs font-medium text-espresso/50 uppercase">Completion Requirement</p>
              <p className="font-medium text-espresso mt-1">
                Progress &ge; {requirement?.minProgressPct ?? 100}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-cream/30 border border-border-warm/60">
              <p className="text-xs font-medium text-espresso/50 uppercase">Assessment Requirement</p>
              <p className="font-medium text-espresso mt-1">
                {requirement?.quiz ? (
                  <>
                    {requirement.quiz.title} (&ge; {requirement.minQuizScore || requirement.quiz.passingScore}%)
                  </>
                ) : (
                  'No quiz required'
                )}
              </p>
            </div>
          </div>
          <div className="pt-2 text-xs text-espresso/60 flex items-center gap-2">
            <span className="font-medium text-espresso">Validity period:</span>{' '}
            {certification.validityDays ? `${certification.validityDays} days from issue date` : 'Permanent / Does not expire'}
          </div>
        </div>

        {/* Issued Certificates List */}
        <div className="bg-white rounded-2xl border border-border-warm overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border-warm flex items-center justify-between">
            <h2 className="text-base font-semibold text-espresso">Issued Certificates ({certificates?.length || 0})</h2>
          </div>

          {!certificates || certificates.length === 0 ? (
            <div className="text-center py-12 px-4 text-sm text-espresso/50">
              No certificates have been issued for this certification yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-espresso">
                <thead className="bg-cream/50 border-b border-border-warm text-xs uppercase tracking-wider text-espresso/60">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Employee</th>
                    <th className="px-6 py-3 font-semibold">Certificate Number</th>
                    <th className="px-6 py-3 font-semibold">Issued Date</th>
                    <th className="px-6 py-3 font-semibold">Expires</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-cream/20 transition">
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-espresso">{cert.user.name}</div>
                        <div className="text-xs text-espresso/50">
                          {cert.user.employeeNumber || 'ID: —'} &bull; {cert.user.department?.name || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-espresso/80">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-espresso/70">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-espresso/70">
                        {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/verify/${cert.verificationCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-gold hover:underline"
                        >
                          Verify &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </HrLayout>
  );
}

