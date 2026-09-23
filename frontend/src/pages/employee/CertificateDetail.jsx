import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EmployeeLayout from '../../layouts/EmployeeLayout';
import { getCertificate } from '../../services/certificateService';
import { StatusBadge, LoadingState, ErrorState } from '../../components/ui/Primitives';

export default function CertificateDetail() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCert() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCertificate(id);
        setCert(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Certificate not found');
      } finally {
        setIsLoading(false);
      }
    }
    fetchCert();
  }, [id]);

  if (isLoading) {
    return (
      <EmployeeLayout>
        <LoadingState label="Loading certificate details..." />
      </EmployeeLayout>
    );
  }

  if (error || !cert) {
    return (
      <EmployeeLayout>
        <ErrorState message={error || 'Certificate not found'} />
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between print:hidden">
          <Link to="/employee/certificates" className="text-xs font-medium text-gold hover:underline">
            &larr; Back to My Certificates
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl border border-border-warm text-xs font-medium text-espresso hover:bg-cream transition"
            >
              🖨️ Print Certificate
            </button>
            <Link
              to={`/verify/${cert.verificationCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-gold text-white text-xs font-medium hover:bg-gold/90 transition shadow-sm"
            >
              Verify Online
            </Link>
          </div>
        </div>

        {/* Official Certificate Canvas / Display Card */}
        <div className="relative bg-white rounded-3xl border-2 border-border-warm p-8 sm:p-12 shadow-md space-y-8 text-center print:shadow-none print:border print:m-0 print:p-8">
          {/* Decorative Corner Borders */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-gold pointer-events-none" />
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-gold pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-gold pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-gold pointer-events-none" />

          {/* Issuer Brand */}
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-gold">
              {cert.company?.name || 'Enterprise LMS'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-espresso tracking-tight">
              Certificate of Completion
            </h1>
          </div>

          {/* Recipient Statement */}
          <div className="space-y-2 py-4">
            <p className="text-xs uppercase tracking-wider text-espresso/50">This is to officially certify that</p>
            <p className="text-2xl sm:text-3xl font-bold text-espresso border-b-2 border-gold/40 pb-2 inline-block px-8">
              {cert.user.name}
            </p>
            {cert.user.employeeNumber && (
              <p className="text-xs text-espresso/40">Employee ID: {cert.user.employeeNumber}</p>
            )}
          </div>

          {/* Certification Subject */}
          <div className="space-y-2 max-w-xl mx-auto">
            <p className="text-xs text-espresso/60">
              has successfully fulfilled all instructional criteria and assessment standards for
            </p>
            <p className="text-xl sm:text-2xl font-semibold text-espresso text-gold">
              {cert.certification.title}
            </p>
            {cert.certification.description && (
              <p className="text-xs text-espresso/60 italic leading-relaxed pt-1">
                &ldquo;{cert.certification.description}&rdquo;
              </p>
            )}
          </div>

          {/* Meta Grid (Dates & Identifiers) */}
          <div className="pt-6 border-t border-border-warm/70 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">Issued Date</p>
              <p className="text-xs font-medium text-espresso mt-0.5">
                {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">Valid Until</p>
              <p className="text-xs font-medium text-espresso mt-0.5">
                {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : 'Never Expires'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">Certificate No.</p>
              <p className="text-xs font-mono font-medium text-espresso mt-0.5 truncate">
                {cert.certificateNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={cert.status} />
              </div>
            </div>
          </div>

          {/* Verification Footnote */}
          <div className="pt-4 text-[11px] text-espresso/50 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border-warm/40">
            <span>
              Verification Code: <span className="font-mono text-espresso font-medium">{cert.verificationCode}</span>
            </span>
            <span className="italic">
              Official digital record verified by {cert.company?.name || 'system'}
            </span>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
}

