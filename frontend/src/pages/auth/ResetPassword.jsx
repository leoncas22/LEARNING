import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authService from '../../services/authService';
import { AuthLayout, FormField, TextInput, PrimaryButton, AlertBanner } from '../../components/auth/AuthLayout';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, password, confirmPassword);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) {
        setFieldErrors(data.details);
      } else {
        setError(data?.message || 'This link is invalid or has expired.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link">
        <AlertBanner>This password reset link is missing its token.</AlertBanner>
        <Link to="/forgot-password" className="block text-center text-sm text-gold hover:underline">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <AlertBanner variant="info">
          Your password has been reset. All previous sessions were signed out. Redirecting to sign in...
        </AlertBanner>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      {error && <AlertBanner>{error}</AlertBanner>}
      <form onSubmit={handleSubmit}>
        <FormField label="New password" error={fieldErrors.password}>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <FormField label="Confirm new password" error={fieldErrors.confirmPassword}>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </FormField>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update password'}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
