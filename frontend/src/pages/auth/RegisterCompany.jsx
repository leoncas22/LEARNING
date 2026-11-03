import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  AuthLayout,
  FormField,
  TextInput,
  PrimaryButton,
  AlertBanner,
} from "../../components/auth/AuthLayout";

const initialForm = {
  companyName: "",
  companyEmail: "",
  companySlug: "",
  adminName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterCompany() {
  const { registerCompany, homePathForRole } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field) {
    return (event) => {
      const { value } = event.target;
      setForm((previous) => ({ ...previous, [field]: value }));
      setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
      setError("");
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setFieldErrors({});
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await registerCompany(form);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === "VALIDATION_ERROR" && data.details) {
        setFieldErrors(data.details);
      } else if (data?.error === "EMAIL_TAKEN") {
        setFieldErrors({
          email: "An account with this administrator email already exists.",
        });
      } else if (data?.error === "COMPANY_SLUG_TAKEN") {
        setFieldErrors({
          companySlug: "This company identifier is already in use.",
        });
      } else {
        setError(data?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Register your company"
      subtitle="Create a Company Admin account to get started"
    >
      {error && <AlertBanner>{error}</AlertBanner>}
      <form onSubmit={handleSubmit}>
        <FormField label="Company name" error={fieldErrors.companyName}>
          <TextInput
            id="company-name"
            autoComplete="organization"
            required
            minLength={2}
            maxLength={150}
            value={form.companyName}
            onChange={update("companyName")}
          />
        </FormField>
        <FormField label="Company email" error={fieldErrors.companyEmail}>
          <TextInput
            id="company-email"
            type="email"
            autoComplete="organization"
            required
            value={form.companyEmail}
            onChange={update("companyEmail")}
          />
        </FormField>
        <FormField
          label="Company identifier (optional)"
          error={fieldErrors.companySlug}
        >
          <TextInput
            id="company-slug"
            autoComplete="off"
            maxLength={60}
            value={form.companySlug}
            onChange={update("companySlug")}
            placeholder="Generated from company name if left blank"
          />
        </FormField>
        <FormField
          label="Administrator full name"
          error={fieldErrors.adminName}
        >
          <TextInput
            id="admin-name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={150}
            value={form.adminName}
            onChange={update("adminName")}
          />
        </FormField>
        <FormField
          label="Administrator email / login"
          error={fieldErrors.email}
        >
          <TextInput
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update("email")}
          />
        </FormField>
        <FormField label="Password" error={fieldErrors.password}>
          <TextInput
            id="registration-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}"
            value={form.password}
            onChange={update("password")}
          />
          <p className="mt-1.5 text-xs text-espresso/50">
            At least 8 characters, with an uppercase letter, a lowercase letter,
            and a number.
          </p>
        </FormField>
        <FormField label="Confirm password" error={fieldErrors.confirmPassword}>
          <TextInput
            id="confirm-registration-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? "confirm-registration-password-error" : undefined}
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
          />
        </FormField>
        <p className="mb-5 text-xs text-espresso/50" role="note">
          You can sign in immediately after registration. Email verification is
          available; delivery depends on the configured email service.
        </p>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Company Account"}
        </PrimaryButton>
      </form>
      <p className="text-center text-sm text-espresso/60 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-gold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
