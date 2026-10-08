import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from '../components/NotificationBell';

const NAV_ITEMS = [
  { to: '/hr', label: 'Dashboard' },
  { to: '/hr/courses', label: 'Courses' },
  { to: '/hr/quizzes', label: 'Quizzes' },
  { to: '/hr/trainings', label: 'Trainings' },
  { to: '/hr/users', label: 'User Management' },
  { to: '/hr/learning-paths', label: 'Learning Paths' },
  { to: '/hr/certifications', label: 'Certifications' },
  { to: '/hr/certificates', label: 'Certificates' },
  { to: '/hr/competencies', label: 'Competencies' },
  { to: '/hr/announcements', label: 'Announcements' },
  { to: '/hr/audit-logs', label: 'Audit log' },
];

export function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 shrink-0 bg-white border-r border-border-warm hidden md:flex md:flex-col">
        <div className="px-6 py-6 border-b border-border-warm">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-espresso text-cream font-semibold text-sm">
            L
          </div>
          <p className="text-xs tracking-widest uppercase text-gold font-medium mt-3">HR / LMS</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="HR navigation">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to || (item.to !== '/hr' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-3 py-2 rounded-xl text-sm font-medium transition ${
                  active ? 'bg-cream text-espresso' : 'text-espresso/60 hover:bg-cream/60 hover:text-espresso'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-border-warm">
          <NotificationBell />
          <p className="text-sm font-medium text-espresso truncate mt-3">{user?.name}</p>
          <p className="text-xs text-espresso/50 truncate">{user?.company?.name}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full text-left text-sm text-espresso/60 hover:text-burgundy transition"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile top bar — sidebar collapses to nothing below md; a full
            drawer is a natural next iteration. */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border-warm">
          <span className="font-semibold text-espresso">HR / LMS</span>
          <button type="button" onClick={logout} className="text-sm text-espresso/60">
            Log out
          </button>
        </header>
        <main className="px-4 md:px-8 py-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}

export default HrLayout;
