import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, ClipboardList, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "../components/NotificationBell";

const NAV_ITEMS = [
  { to: "/instructor", label: "Dashboard", roles: ["INSTRUCTOR"], icon: LayoutDashboard },
  { to: "/instructor/courses", label: "My Courses", roles: ["INSTRUCTOR"], icon: BookOpen },
  { to: "/instructor/learners", label: "Learners", roles: ["INSTRUCTOR"], icon: Users },
  { to: "/instructor/quizzes", label: "Quizzes", roles: ["INSTRUCTOR"], icon: ClipboardList },
];

function NavigationLinks({ items, location, onNavigate }) {
  return items.map((item) => {
    const active = item.to === "/instructor" ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    const Icon = item.icon;
    return <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-cream text-espresso" : "text-espresso/60 hover:bg-cream/70 hover:text-espresso"}`}><Icon size={17} /><span>{item.label}</span></Link>;
  });
}

export default function InstructorLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  return <div className="min-h-screen bg-background md:flex">
    <aside className="hidden w-64 shrink-0 border-r border-border-warm bg-white md:flex md:flex-col">
      <Link to="/instructor" className="flex items-center gap-3 border-b border-border-warm px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-espresso text-sm font-semibold text-cream">L</span><span><span className="block text-sm font-semibold text-espresso">LMS Platform</span><span className="mt-0.5 block text-xs text-espresso/50">Instructor workspace</span></span></Link>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Instructor navigation"><NavigationLinks items={navItems} location={location} /></nav>
      <div className="border-t border-border-warm px-4 py-4">{user?.role === "INSTRUCTOR" && <NotificationBell />}<p className="mt-3 truncate text-sm font-semibold text-espresso">{user?.name}</p><p className="truncate text-xs text-espresso/50">{user?.company?.name}</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/60 hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} /> Log out</button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-border-warm bg-white md:hidden"><div className="flex items-center justify-between px-4 py-3"><Link to="/instructor" className="flex items-center gap-2 font-semibold text-espresso"><span className="grid h-8 w-8 place-items-center rounded-lg bg-espresso text-sm text-cream">L</span> LMS <span className="text-xs font-normal text-espresso/50">Instructor</span></Link><div className="flex items-center gap-2">{user?.role === "INSTRUCTOR" && <NotificationBell />}<button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="instructor-mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-xl text-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div></div>{menuOpen && <div id="instructor-mobile-navigation" className="border-t border-border-warm bg-white px-3 py-3"><nav className="space-y-1" aria-label="Instructor navigation"><NavigationLinks items={navItems} location={location} onNavigate={() => setMenuOpen(false)} /></nav><div className="mt-3 border-t border-border-warm px-3 pt-3"><p className="truncate text-sm font-semibold text-espresso">{user?.name}</p><p className="truncate text-xs text-espresso/50">{user?.company?.name}</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/70 hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} /> Log out</button></div></div>}</header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
    </div>
  </div>;
}
