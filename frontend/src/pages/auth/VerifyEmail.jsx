import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as authService from '../../services/authService';
import { AuthLayout, AlertBanner } from '../../components/auth/AuthLayout';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    authService
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthLayout title="Email verification">
      {status === 'verifying' && <p className="text-center text-espresso/60">Verifying your email...</p>}
      {status === 'success' && (
        <AlertBanner variant="info">Your email has been verified. You're all set.</AlertBanner>
      )}
      {status === 'error' && <AlertBanner>This verification link is invalid or has expired.</AlertBanner>}
      <Link to="/login" className="block text-center text-sm text-gold hover:underline mt-4">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
