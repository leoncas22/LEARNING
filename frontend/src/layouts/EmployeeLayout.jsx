import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from '../components/NotificationBell';

const NAV_ITEMS = [
  { to: '/employee/courses', label: 'My Learning' },
  { to: '/employee/learning-paths', label: 'Learning Paths' },
  { to: '/employee/quizzes', label: 'Quizzes' },
  { to: '/employee/quiz-history', label: 'Quiz History' },
  { to: '/employee/certificates', label: 'Certificates' },
  { to: '/employee/competencies', label: 'Competencies' },
  { to: '/employee/announcements', label: 'Announcements' },
];

export function EmployeeLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border-warm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <Link to="/employee" className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-espresso text-cream font-semibold text-sm">
                L
              </span>
            </Link>
            <nav className="flex items-center gap-4" aria-label="Employee navigation">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`text-sm font-medium transition ${active ? 'text-espresso' : 'text-espresso/50 hover:text-espresso'}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-espresso/60 hidden sm:inline">{user?.name}</span>
            <button type="button" onClick={logout} className="text-sm text-espresso/60 hover:text-burgundy transition">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">{children}</main>
    </div>
  );
}

export default EmployeeLayout;
