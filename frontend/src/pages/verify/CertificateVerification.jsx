import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyCertificate } from '../../services/certificateService';
import { StatusBadge, LoadingState } from '../../components/ui/Primitives';

export default function CertificateVerification() {
  const { verificationCode } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function performVerification() {
      setIsLoading(true);
      try {
        const res = await verifyCertificate(verificationCode);
        setResult(res);
      } catch (err) {
        setResult({ valid: false, reason: 'NOT_FOUND' });
      } finally {
        setIsLoading(false);
      }
    }
    performVerification();
  }, [verificationCode]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-espresso text-cream font-bold text-base shadow-sm">
            L
          </div>
          <p className="text-xs uppercase tracking-widest text-gold font-bold pt-2">
            Credential Verification Portal
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl border border-border-warm p-6 sm:p-8 shadow-sm space-y-6">
          {isLoading ? (
            <LoadingState label="Verifying certificate cryptographic record..." />
          ) : !result || !result.status || result.reason === 'NOT_FOUND' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-xl font-bold">
                ✕
              </div>
              <div>
                <h1 className="text-lg font-bold text-espresso">Certificate Not Found</h1>
                <p className="text-xs text-espresso/60 mt-1 max-w-xs mx-auto">
                  The verification code does not match any valid certificate in our registry.
                </p>
              </div>
              <div className="pt-2 text-xs font-mono text-espresso/40">
                Code: {verificationCode}
              </div>
            </div>
          ) : result.status === 'REVOKED' ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-burgundy/10 text-burgundy mx-auto flex items-center justify-center text-xl font-bold">
                !
              </div>
              <div>
                <div className="inline-block mb-2">
                  <StatusBadge status="REVOKED" />
                </div>
                <h1 className="text-xl font-bold text-espresso">Certificate Revoked</h1>
                <p className="text-xs text-espresso/60 mt-1">
                  This credential was officially revoked and is no longer valid.
                </p>
              </div>

              <div className="text-left bg-cream/30 rounded-2xl border border-border-warm/60 p-4 space-y-2 text-xs text-espresso">
                <div>
                  <span className="text-espresso/50">Certification:</span>{' '}
                  <span className="font-semibold">{result.certificationTitle}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Issued To:</span>{' '}
                  <span className="font-semibold">{result.recipientName}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Issuing Organization:</span>{' '}
                  <span className="font-semibold">{result.companyName}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Certificate Number:</span>{' '}
                  <span className="font-mono">{result.certificateNumber}</span>
                </div>
              </div>
            </div>
          ) : result.status === 'EXPIRED' ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center text-xl font-bold">
                ⌛
              </div>
              <div>
                <div className="inline-block mb-2">
                  <StatusBadge status="EXPIRED" />
                </div>
                <h1 className="text-xl font-bold text-espresso">Certificate Expired</h1>
                <p className="text-xs text-espresso/60 mt-1">
                  This certificate has passed its validity period.
                </p>
              </div>

              <div className="text-left bg-cream/30 rounded-2xl border border-border-warm/60 p-4 space-y-2 text-xs text-espresso">
                <div>
                  <span className="text-espresso/50">Certification:</span>{' '}
                  <span className="font-semibold">{result.certificationTitle}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Issued To:</span>{' '}
                  <span className="font-semibold">{result.recipientName}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Issued Date:</span>{' '}
                  <span>{new Date(result.issuedAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-espresso/50">Expired On:</span>{' '}
                  <span className="font-semibold text-burgundy">
                    {result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* VALID CERTIFICATE */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center text-xl font-bold">
                  ✓
                </div>
                <div className="inline-block">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    ✓ Certificate Valid & Authenticated
                  </span>
                </div>
                <h1 className="text-xl font-bold text-espresso pt-1">
                  {result.certificationTitle}
                </h1>
              </div>

              <div className="bg-cream/40 rounded-2xl border border-border-warm/70 p-4 space-y-3 text-xs text-espresso">
                <div className="flex justify-between items-center py-1 border-b border-border-warm/40">
                  <span className="text-espresso/60">Issued To</span>
                  <span className="font-bold text-espresso text-sm">{result.recipientName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-warm/40">
                  <span className="text-espresso/60">Issuing Organization</span>
                  <span className="font-semibold text-espresso">{result.companyName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-warm/40">
                  <span className="text-espresso/60">Issued Date</span>
                  <span>{new Date(result.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-warm/40">
                  <span className="text-espresso/60">Valid Until</span>
                  <span>{result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : 'Never Expires'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border-warm/40">
                  <span className="text-espresso/60">Certificate Number</span>
                  <span className="font-mono font-medium">{result.certificateNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-espresso/60">Verification Code</span>
                  <span className="font-mono text-[11px] text-espresso/70">{result.verificationCode}</span>
                </div>
              </div>

              <p className="text-[11px] text-center text-espresso/50 italic">
                Official digital credential record issued by {result.companyName}.
              </p>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-espresso/50 hover:text-gold transition">
            &larr; Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

