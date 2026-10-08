import { useState } from 'react';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-slate-100 text-slate-400',
  ASSIGNED: 'bg-gold/10 text-gold',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
  OVERDUE: 'bg-burgundy/10 text-burgundy',
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  // Quiz attempt and result statuses
  PASSED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-burgundy/10 text-burgundy',
  GRADED: 'bg-emerald-50 text-emerald-700',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  EXPIRED: 'bg-burgundy/10 text-burgundy',
  // Certification and competency statuses
  REVOKED: 'bg-burgundy/15 text-burgundy font-semibold',
  BEGINNER: 'bg-slate-100 text-slate-700',
  INTERMEDIATE: 'bg-blue-50 text-blue-700',
  ADVANCED: 'bg-gold/15 text-gold font-medium',
  EXPERT: 'bg-emerald-50 text-emerald-800 font-semibold',
};

const STATUS_LABELS = {
  IN_PROGRESS: 'In Progress',
  REVOKED: 'Revoked',
  EXPIRED: 'Expired',
};

/** Never conveys status through color alone — always paired with text. */
export function StatusBadge({ status, overdue = false }) {
  const effectiveStatus = overdue ? 'OVERDUE' : status;
  const label = overdue ? 'Overdue' : STATUS_LABELS[status] || (status ? status.charAt(0) + status.slice(1).toLowerCase() : '');
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_STYLES[effectiveStatus] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

export function ProgressBar({ value = 0, className = '' }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs text-espresso/60 mb-1">
        <span>Progress</span>
        <span className="font-medium text-espresso">{clamped}%</span>
      </div>
      <div
        className="h-2 rounded-full bg-border-warm/60 overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/30 text-sm" aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-border-warm bg-white pl-9 pr-4 py-2.5 text-sm text-espresso placeholder:text-espresso/40 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      />
    </div>
  );
}

export function FilterDropdown({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border-warm bg-white px-3 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg border border-border-warm text-sm text-espresso disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream transition"
      >
        Previous
      </button>
      <span className="text-sm text-espresso/60 px-2">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg border border-border-warm text-sm text-espresso disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cream transition"
      >
        Next
      </button>
    </nav>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/40 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="bg-white rounded-2xl border border-border-warm shadow-lg max-w-sm w-full p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-espresso">
          {title}
        </h2>
        {description && <p className="text-sm text-espresso/60 mt-2">{description}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition ${danger ? 'bg-burgundy hover:bg-burgundy/90' : 'bg-espresso hover:bg-espresso/90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-espresso font-medium">{title}</p>
      {description && <p className="text-sm text-espresso/50 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="text-center py-16 px-4 text-espresso/50 text-sm" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div className="text-center py-16 px-4" role="alert">
      <p className="text-burgundy font-medium">Unable to load data</p>
      <p className="text-sm text-espresso/50 mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl border border-border-warm text-sm font-medium text-espresso hover:bg-cream transition"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState(null); // { title, description, danger, resolve }

  function confirm({ title, description, danger = false, confirmLabel, cancelLabel }) {
    return new Promise((resolve) => {
      setState({ title, description, danger, confirmLabel, cancelLabel, resolve });
    });
  }

  const dialog = state ? (
    <ConfirmDialog
      open
      title={state.title}
      description={state.description}
      danger={state.danger}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      onConfirm={() => {
        state.resolve(true);
        setState(null);
      }}
      onCancel={() => {
        state.resolve(false);
        setState(null);
      }}
    />
  ) : null;

  return { confirm, dialog };
}
