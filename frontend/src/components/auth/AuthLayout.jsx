import { cloneElement } from "react";

/**
 * Shared visual shell for /login, /register-company, /forgot-password,
 * /reset-password, /verify-email. Deliberately plain — per spec §35,
 * "Jangan membuat login page terlalu ramai."
 */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-espresso text-cream font-semibold text-lg mb-4">
            L
          </div>
          <p className="text-xs tracking-widest uppercase text-gold font-medium">HR / LMS</p>
        </div>

        <div className="bg-white border border-border-warm rounded-2xl shadow-sm px-8 py-10">
          <h1 className="text-2xl font-semibold text-espresso text-center">{title}</h1>
          {subtitle && <p className="text-sm text-espresso/60 text-center mt-2">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, error, children }) {
  return (
    <div className="mb-5">
      {children?.props?.id ? <label htmlFor={children.props.id} className="block text-sm font-medium text-espresso mb-1.5">{label}</label> : <span className="block text-sm font-medium text-espresso mb-1.5">{label}</span>}
      {children && error && children.props.id
        ? cloneElement(children, { "aria-invalid": true, "aria-describedby": `${children.props.id}-error` })
        : children}
      {error && <p id={children?.props?.id ? `${children.props.id}-error` : undefined} className="mt-1.5 text-sm text-burgundy" role="alert">{error}</p>}
    </div>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={
        'w-full rounded-xl border border-border-warm bg-white px-4 py-2.5 text-espresso placeholder:text-espresso/30 ' +
        'focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition ' +
        (props.className || '')
      }
    />
  );
}

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className={
        'w-full rounded-xl bg-espresso text-cream font-medium py-2.5 transition hover:bg-espresso/90 ' +
        'disabled:opacity-50 disabled:cursor-not-allowed ' +
        (props.className || '')
      }
    >
      {children}
    </button>
  );
}

export function AlertBanner({ variant = 'error', children }) {
  const styles =
    variant === 'error'
      ? 'bg-burgundy/5 border-burgundy/20 text-burgundy'
      : 'bg-gold/10 border-gold/30 text-espresso';
  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
