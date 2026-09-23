import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { listMyCertificates } from '../../services/certificateService';
import { StatusBadge, LoadingState, EmptyState, ErrorState } from '../../components/ui/Primitives';

export default function MyCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMyCertificates();
      setCertificates(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your certificates');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-espresso">My Certificates</h1>
          <p className="text-sm text-espresso/60 mt-1">
            Official verifiable credentials earned through course completions and assessments
          </p>
        </div>

        {isLoading ? (
          <LoadingState label="Loading your certificates..." />
        ) : error ? (
          <ErrorState message={error} onRetry={loadData} />
        ) : certificates.length === 0 ? (
          <EmptyState
            title="No certificates earned yet"
            description="Complete required training courses and pass assessments to earn verified certificates."
            action={
              <Link
                to="/employee/courses"
                className="px-4 py-2 rounded-xl bg-espresso text-cream text-sm font-medium hover:bg-espresso/90 transition"
              >
                Go to My Learning
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-gold transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-mono font-medium text-espresso/50">
                      {cert.certificateNumber}
                    </span>
                    <StatusBadge status={cert.status} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-espresso leading-snug">
                      {cert.certification.title}
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1">
                      Awarded by {cert.companyName}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-warm/60 space-y-3">
                  <div className="flex items-center justify-between text-xs text-espresso/70">
                    <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                    <span>
                      {cert.expiresAt
                        ? `Expires: ${new Date(cert.expiresAt).toLocaleDateString()}`
                        : 'Never Expires'}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      to={`/verify/${cert.verificationCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-border-warm text-xs font-medium text-espresso/70 hover:text-gold hover:bg-cream transition"
                    >
                      Verify Publicly
                    </Link>
                    <Link
                      to={`/employee/certificates/${cert.id}`}
                      className="px-4 py-1.5 rounded-xl bg-espresso text-cream text-xs font-medium hover:bg-espresso/90 transition"
                    >
                      View Certificate
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}

