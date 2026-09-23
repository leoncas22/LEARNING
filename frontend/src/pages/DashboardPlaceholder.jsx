import { useAuth } from '../hooks/useAuth';

/**
 * Intentionally minimal — Phase 3 is authentication/authorization only.
 * Real dashboards (HR, Employee, Instructor, Admin) are later phases. This
 * exists so role-based redirect and route protection are demonstrably
 * working end to end.
 */
export default function DashboardPlaceholder({ title }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface border border-slate-200 rounded-2xl shadow-sm px-8 py-10 max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-text-main">{title}</h1>
        <p className="text-muted mt-2">
          Signed in as <span className="font-medium text-text-main">{user?.name}</span> ({user?.role})
        </p>
        {user?.company && <p className="text-sm text-muted mt-1">{user.company.name}</p>}
        <button
          onClick={logout}
          className="mt-6 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-text-main hover:bg-slate-50 transition"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
