import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleNavItems } from '../../router/roleRoutes';
import { LogoMark } from '../auth/LogoMark';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { auth, logout } = useAuth();
  if (auth.status !== 'authenticated') return null;

  const navItems = roleNavItems[auth.user.role];

  return (
    <aside
      className="relative flex flex-col h-full border-r border-slate-200 bg-white transition-all duration-200"
      style={{ width: collapsed ? 64 : 220 }}
    >
      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b border-slate-100" style={{ minHeight: 64 }}>
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mx-auto"
            style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
          >
            LD
          </div>
        ) : (
          <LogoMark size={32} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`
            }
            style={({ isActive }) =>
              isActive ? { background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' } : {}
            }
          >
            <item.icon size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-100 px-2 py-3">
        <button
          onClick={logout}
          title={collapsed ? 'Sign out' : undefined}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm z-10"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  );
}
