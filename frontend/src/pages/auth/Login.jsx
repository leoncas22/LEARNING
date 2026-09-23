import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { AuthLayout, FormField, TextInput, PrimaryButton, AlertBanner } from '../../components/auth/AuthLayout';

export default function Login() {
  const { login, homePathForRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      const redirectTo = location.state?.from?.pathname || homePathForRole(user.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Backend always returns a generic message here — never "email
      // exists but password wrong" (account enumeration protection).
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue">
      {error && <AlertBanner>{error}</AlertBanner>}
      <form onSubmit={handleSubmit}>
        <FormField label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="Password">
          <TextInput
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end mb-6 -mt-2">
          <Link to="/forgot-password" className="text-sm text-gold hover:underline">
            Forgot password?
          </Link>
        </div>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-espresso/60 mt-6">
        New company?{' '}
        <Link to="/register-company" className="text-gold hover:underline">
          Register here
        </Link>
      </p>
    </AuthLayout>
  );
}
