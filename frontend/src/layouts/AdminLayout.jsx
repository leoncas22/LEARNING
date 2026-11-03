import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'User management', icon: Users },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
];

function NavLinks({ onNavigate }) {
  const location = useLocation();
  return NAV_ITEMS.map((item) => {
    const active = item.exact ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    const Icon = item.icon;
    return <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? 'bg-cream text-espresso' : 'text-espresso/60 hover:bg-cream/70 hover:text-espresso'}`}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span></Link>;
  });
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return <div className="min-h-screen bg-background md:flex">
    <aside className="hidden w-64 shrink-0 border-r border-border-warm bg-white md:flex md:flex-col">
      <Link to="/admin" className="flex items-center gap-3 border-b border-border-warm px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-espresso text-cream"><ShieldCheck size={19} /></span><span><span className="block text-sm font-semibold text-espresso">LMS Platform</span><span className="mt-0.5 block text-xs text-espresso/50">Platform control center</span></span></Link>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Platform navigation"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-espresso/40">Platform</p><NavLinks /></nav>
      <div className="border-t border-border-warm px-4 py-4"><p className="truncate text-sm font-semibold text-espresso">{user?.name || 'Super Admin'}</p><p className="truncate text-xs text-espresso/50">{user?.email}</p><span className="mt-2 inline-flex rounded-lg bg-burgundy/10 px-2 py-1 text-[11px] font-semibold text-burgundy">SUPER ADMIN</span><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/60 transition hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><LogOut size={16} /> Log out</button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-border-warm bg-white md:hidden"><div className="flex items-center justify-between px-4 py-3"><Link to="/admin" className="flex items-center gap-2 font-semibold text-espresso"><span className="grid h-8 w-8 place-items-center rounded-lg bg-espresso text-cream"><ShieldCheck size={16} /></span>LMS <span className="text-xs font-normal text-espresso/50">Platform admin</span></Link><button type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="platform-mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-xl text-espresso hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>{menuOpen && <div id="platform-mobile-navigation" className="border-t border-border-warm bg-white px-3 py-3"><nav className="space-y-1" aria-label="Platform navigation"><NavLinks onNavigate={closeMenu} /></nav><div className="mt-3 border-t border-border-warm px-3 pt-3"><p className="truncate text-sm font-semibold text-espresso">{user?.name}</p><p className="truncate text-xs text-espresso/50">{user?.email}</p><button type="button" onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-espresso/70 hover:text-burgundy"><LogOut size={16} /> Log out</button></div></div>}</header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
    </div>
  </div>;
}
