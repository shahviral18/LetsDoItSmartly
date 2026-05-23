import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Shield, History, ClipboardList, LayoutDashboard,
  Settings, ChevronLeft, ChevronRight, LogOut, Bell,
  Briefcase, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/admin', label: 'Super Admin', icon: Settings, end: true },
  { to: '/admin/security-alerts', label: 'Security Alerts', icon: Shield },
  { to: '/admin/login-history', label: 'Login History', icon: History },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { to: '/admin/backoffice', label: 'Backoffice', icon: Briefcase },
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F0F7FF] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-30 flex flex-col h-full bg-[#0D5A96] text-white transition-all duration-300
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
            LD
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm leading-tight">
              Admin &amp; Audit<br />
              <span className="text-white/60 text-xs font-normal">TechnoDoc Solutions</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex items-center justify-center h-10 w-full border-t border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between h-14 px-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-sm font-semibold text-slate-700">
              Admin &amp; Audit Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#1A7DC4] flex items-center justify-center text-white text-xs font-bold">
                VS
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-slate-700">Viral Shah</p>
                <p className="text-[11px] text-slate-400">Super Admin</p>
              </div>
            </div>
            <button className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
