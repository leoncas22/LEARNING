import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Award, BookOpen, ClipboardList, Compass, LayoutDashboard, LogOut, Megaphone, Menu, Network, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "../components/NotificationBell";

const NAV_ITEMS = [
  { to: "/employee", label: "Overview", roles: ["EMPLOYEE"], icon: LayoutDashboard, exact: true },
  { to: "/employee/courses", label: "My Learning", roles: ["EMPLOYEE"], icon: BookOpen },
  { to: "/employee/learning-paths", label: "Learning Paths", roles: ["EMPLOYEE"], icon: Compass },
  { to: "/employee/quizzes", label: "Quizzes", roles: ["EMPLOYEE"], icon: ClipboardList },
  { to: "/employee/quiz-history", label: "Quiz History", roles: ["EMPLOYEE"], icon: ClipboardList },
  { to: "/employee/certificates", label: "Certificates", roles: ["EMPLOYEE"], icon: Award },
  { to: "/employee/competencies", label: "Competencies", roles: ["EMPLOYEE"], icon: Network },
  { to: "/employee/announcements", label: "Announcements", roles: ["EMPLOYEE"], icon: Megaphone },
];

function NavigationLinks({ items, location, onNavigate, mobile = false }) {
  return items.map((item) => {
    const active = item.exact ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    const Icon = item.icon;
    return <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`${mobile ? "" : "whitespace-nowrap"} flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-cream text-espresso" : "text-espresso/60 hover:bg-cream/70 hover:text-espresso"}`}><Icon size={16} /><span>{item.label}</span></Link>;
  });
}

export function EmployeeLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b border-border-warm bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
        <Link to="/employee" className="flex shrink-0 items-center gap-2 font-semibold text-espresso"><span className="grid h-9 w-9 place-items-center rounded-xl bg-espresso text-sm text-cream">L</span><span>LMS Platform</span></Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto px-3 lg:flex" aria-label="Employee navigation"><NavigationLinks items={navItems} location={location} /></nav>
        <div className="flex shrink-0 items-center gap-3">{user?.role === "EMPLOYEE" && <NotificationBell />}<span className="hidden max-w-36 truncate text-sm text-espresso/60 sm:inline">{user?.name}</span><button type="button" onClick={logout} className="hidden rounded-lg px-2 py-1 text-sm text-espresso/60 transition hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:inline-flex"><LogOut size={16} className="mr-1.5" />Log out</button><button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="employee-mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-xl text-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </div>
      {menuOpen && <div id="employee-mobile-navigation" className="border-t border-border-warm bg-white px-4 py-3 lg:hidden"><nav className="grid grid-cols-2 gap-1 sm:grid-cols-3" aria-label="Employee navigation"><NavigationLinks items={navItems} location={location} mobile onNavigate={() => setMenuOpen(false)} /></nav><div className="mt-3 flex items-center justify-between border-t border-border-warm pt-3"><span className="truncate text-sm text-espresso/60">{user?.name}</span><button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-espresso/70 hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} />Log out</button></div></div>}
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
  </div>;
}

export default EmployeeLayout;
