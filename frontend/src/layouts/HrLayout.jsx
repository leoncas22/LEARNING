import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Network, ShieldCheck, Users, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import NotificationBell from "../components/NotificationBell";

const NAV_ITEMS = [
  { to: "/hr", label: "Dashboard", roles: ["COMPANY_ADMIN"], icon: LayoutDashboard, group: "Workspace" },
  { to: "/hr/courses", label: "Courses", roles: ["COMPANY_ADMIN"], icon: BookOpen, group: "Workspace" },
  { to: "/hr/quizzes", label: "Quizzes", roles: ["COMPANY_ADMIN"], icon: ClipboardList, group: "Workspace" },
  { to: "/hr/trainings", label: "Trainings", roles: ["COMPANY_ADMIN"], icon: GraduationCap, group: "Workspace" },
  { to: "/hr/users", label: "User Management", roles: ["COMPANY_ADMIN"], icon: Users, group: "Organization" },
  { to: "/hr/departments", label: "Departments", roles: ["COMPANY_ADMIN"], icon: Network, group: "Organization" },
  { to: "/hr/learning-paths", label: "Learning Paths", roles: ["COMPANY_ADMIN"], icon: Network, group: "Organization" },
  { to: "/hr/certifications", label: "Certifications", roles: ["COMPANY_ADMIN"], icon: ShieldCheck, group: "Organization" },
  { to: "/hr/certificates", label: "Certificates", roles: ["COMPANY_ADMIN"], icon: ShieldCheck, group: "Organization" },
  { to: "/hr/competencies", label: "Competencies", roles: ["COMPANY_ADMIN"], icon: GraduationCap, group: "Organization" },
  { to: "/hr/announcements", label: "Announcements", roles: ["COMPANY_ADMIN"], icon: ClipboardList, group: "Organization" },
  { to: "/hr/audit-logs", label: "Audit log", roles: ["COMPANY_ADMIN"], icon: ShieldCheck, group: "Organization" },
];

function NavigationLinks({ items, location, onNavigate }) {
  let lastGroup = "";
  return items.map((item) => {
    const active = item.to === "/hr" ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    const groupHeading = item.group !== lastGroup;
    lastGroup = item.group;
    const Icon = item.icon;
    return <div key={item.to}>{groupHeading && <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-espresso/40 first:pt-1">{item.group}</p>}<Link to={item.to} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-cream text-espresso" : "text-espresso/60 hover:bg-cream/70 hover:text-espresso"}`}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span></Link></div>;
  });
}

export function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-64 shrink-0 border-r border border-border-warm bg-white md:flex md:flex-col">
        <Link to="/hr" className="flex items-center gap-3 border-b border-border-warm px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-espresso text-sm font-semibold text-cream">L</span><span><span className="block text-sm font-semibold text-espresso">LMS Platform</span><span className="mt-0.5 block text-xs text-espresso/50">Company workspace</span></span></Link>
        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="HR navigation"><NavigationLinks items={navItems} location={location} /></nav>
        <div className="border-t border-border-warm px-4 py-4">{user?.role === "COMPANY_ADMIN" && <NotificationBell />}<p className="mt-3 truncate text-sm font-semibold text-espresso">{user?.name}</p><p className="truncate text-xs text-espresso/50">{user?.company?.name}</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/60 transition hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} /> Log out</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border border-border-warm bg-white md:hidden"><div className="flex items-center justify-between px-4 py-3"><Link to="/hr" className="flex items-center gap-2 font-semibold text-espresso"><span className="grid h-8 w-8 place-items-center rounded-lg bg-espresso text-sm text-cream">L</span> LMS <span className="text-xs font-normal text-espresso/50">Company</span></Link><div className="flex items-center gap-2">{user?.role === "COMPANY_ADMIN" && <NotificationBell />}<button type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="hr-mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-xl text-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div></div>{menuOpen && <div id="hr-mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border border-border-warm bg-white px-3 py-2"><nav aria-label="HR navigation"><NavigationLinks items={navItems} location={location} onNavigate={closeMenu} /></nav><div className="mt-2 border-t border-border-warm px-3 py-3"><p className="truncate text-sm font-semibold text-espresso">{user?.name}</p><p className="truncate text-xs text-espresso/50">{user?.company?.name}</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/70 hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} /> Log out</button></div></div>}</header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

export default HrLayout;
