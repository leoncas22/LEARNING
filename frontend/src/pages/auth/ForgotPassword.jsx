import { useState } from "react";
import { Link } from "react-router-dom";
import * as authService from "../../services/authService";
import {
  AuthLayout,
  FormField,
  TextInput,
  PrimaryButton,
  AlertBanner,
} from "../../components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(email);
      // Keep account existence private while showing confirmation only when
      // the request has actually reached the server successfully.
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to contact the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Check your email">
        <AlertBanner variant="info">
          If an account exists for <strong>{email}</strong>, a password reset
          link has been sent.
        </AlertBanner>
        <Link
          to="/login"
          className="block text-center text-sm text-gold hover:underline"
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We'll send you a link to reset it"
    >
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
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-espresso/60 mt-6">
        <Link to="/login" className="text-gold hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
