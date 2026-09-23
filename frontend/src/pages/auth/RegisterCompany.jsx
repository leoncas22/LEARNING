import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout, FormField, TextInput, PrimaryButton, AlertBanner } from '../../components/auth/AuthLayout';

const initialForm = { companyName: '', adminName: '', email: '', password: '' };

export default function RegisterCompany() {
  const { registerCompany, homePathForRole } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const user = await registerCompany(form);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'VALIDATION_ERROR' && data.details) {
        setFieldErrors(data.details);
      } else {
        setError(data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Register your company" subtitle="Create a Company Admin account to get started">
      {error && <AlertBanner>{error}</AlertBanner>}
      <form onSubmit={handleSubmit}>
        <FormField label="Company name" error={fieldErrors.companyName}>
          <TextInput required value={form.companyName} onChange={update('companyName')} />
        </FormField>
        <FormField label="Your name" error={fieldErrors.adminName}>
          <TextInput required value={form.adminName} onChange={update('adminName')} />
        </FormField>
        <FormField label="Email" error={fieldErrors.email}>
          <TextInput type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        </FormField>
        <FormField label="Password" error={fieldErrors.password}>
          <TextInput
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={update('password')}
          />
          <p className="mt-1.5 text-xs text-espresso/50">
            At least 8 characters, with an uppercase letter, a lowercase letter, and a number.
          </p>
        </FormField>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create Company Account'}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-espresso/60 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
