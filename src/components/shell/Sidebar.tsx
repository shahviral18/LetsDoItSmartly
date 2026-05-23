import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, Globe, Shield, CreditCard, FileText, ScrollText, Settings, ChevronLeft, ChevronRight, LogOut, ChevronDown, Handshake, BarChart3, Bell, Tag, Building2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types";

const navGroups = [
  { label: "OVERVIEW", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["super_admin","admin","account_manager","support_admin","backoffice","auditor","distributor","domain_owner"] },
  ]},
  { label: "MANAGEMENT", items: [
    { label: "Users", href: "/users", icon: Users, roles: ["super_admin","admin","account_manager","support_admin","domain_owner"] },
    { label: "Domains", href: "/domains", icon: Globe, roles: ["super_admin","admin","account_manager","domain_owner"] },
    { label: "Storage", href: "/storage", icon: BarChart3, roles: ["super_admin","admin","account_manager","domain_owner"] },
    { label: "Shared Drives", href: "/shared-drives", icon: Building2, roles: ["super_admin","admin","account_manager","domain_owner"] },
  ]},
  { label: "BILLING", items: [
    { label: "Buy Licenses", href: "/billing/buy", icon: CreditCard, roles: ["super_admin","admin","backoffice","domain_owner"] },
    { label: "Invoices", href: "/billing/invoices", icon: FileText, roles: ["super_admin","admin","backoffice","domain_owner"] },
  ]},
  { label: "SECURITY", items: [
    { label: "Security Alerts", href: "/security/alerts", icon: Bell, roles: ["super_admin","admin","support_admin","auditor","domain_owner"] },
    { label: "Login History", href: "/security/logins", icon: Shield, roles: ["super_admin","admin","support_admin","auditor","domain_owner"] },
    { label: "Audit Log", href: "/security/audit", icon: ScrollText, roles: ["super_admin","admin","auditor"] },
  ]},
  { label: "COMMERCIAL", items: [
    { label: "Distributors", href: "/distributors", icon: Handshake, roles: ["super_admin","admin"] },
    { label: "My Clients", href: "/distributor/clients", icon: Users, roles: ["distributor"] },
    { label: "Coupons", href: "/admin/coupons", icon: Tag, roles: ["super_admin"] },
  ]},
  { label: "SETTINGS", items: [
    { label: "Super Admin", href: "/admin/super", icon: Settings, roles: ["super_admin"] },
  ]},
] as const;

function NavBtn({ item, collapsed, onClick }: { item: any; collapsed: boolean; onClick?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
  return (
    <button onClick={() => { navigate(item.href); onClick?.(); }} title={collapsed ? item.label : undefined}
      className={cn("relative w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer select-none",
        collapsed ? "justify-center" : "justify-start",
        isActive ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
      <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "")} />
      {!collapsed && <span className="flex-1 truncate leading-none">{item.label}</span>}
    </button>
  );
}

function SidebarNav({ collapsed, role, onClick }: { collapsed: boolean; role: Role; onClick?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
      {navGroups.map((group, gi) => {
        const visible = group.items.filter((i: any) => i.roles.includes(role));
        if (!visible.length) return null;
        return (
          <div key={group.label}>
            {!collapsed && <div className="mb-1.5 px-2"><p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">{group.label}</p><div className="mt-1 h-px bg-primary/20" /></div>}
            {collapsed && gi > 0 && <div className="my-1 mx-3 h-px bg-primary/20" />}
            <div className="space-y-0.5">{visible.map((item: any) => <NavBtn key={item.href} item={item} collapsed={collapsed} onClick={onClick} />)}</div>
          </div>
        );
      })}
    </nav>
  );
}

function UserFooter({ collapsed, onLogout }: { collapsed: boolean; onLogout: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "U";
  return (
    <div className="flex flex-col border-t border-sidebar-border shrink-0 select-none relative">
      <button onClick={() => setOpen(!open)} className={cn("p-3 cursor-pointer hover:bg-sidebar-accent transition-colors w-full", collapsed ? "flex justify-center" : "")}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
          {!collapsed && <><div className="flex-1 min-w-0 text-left"><p className="text-xs font-bold text-sidebar-accent-foreground truncate">{user?.name}</p><p className="text-[10px] text-sidebar-foreground truncate">{user?.email}</p></div><ChevronDown className={cn("w-3.5 h-3.5 text-sidebar-foreground transition-transform", open && "rotate-180")} /></>}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className={cn("absolute bottom-full mb-1 rounded-xl border border-border bg-card shadow-card overflow-hidden z-50", collapsed ? "left-full ml-2 w-48" : "left-2 right-2")}>
            <div className="px-3 py-2.5 border-b border-border"><p className="text-xs font-bold text-foreground">{user?.name}</p><p className="text-[10px] text-muted-foreground">{user?.email}</p></div>
            <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"><LogOut className="w-4 h-4" /> Logout</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface SidebarProps { collapsed: boolean; onCollapse: (v: boolean) => void; mobileOpen: boolean; onMobileClose: () => void; }

export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = (user?.role ?? "domain_owner") as Role;
  const handleLogout = () => { logout(); navigate("/login"); };
  const Logo = ({ small }: { small?: boolean }) => (
    <div className={cn("flex items-center gap-2.5 min-w-0", small && "justify-center")}>
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0"><span className="text-sm font-black text-white">L</span></div>
      {!small && <div className="min-w-0"><p className="text-sm font-bold text-sidebar-accent-foreground leading-tight">Letsdoitsmartly</p><p className="text-[10px] text-sidebar-foreground">Email Solution</p></div>}
    </div>
  );
  return (
    <>
      <motion.aside animate={{ width: collapsed ? 64 : 240 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className="hidden md:flex flex-col h-full shrink-0 z-20 bg-sidebar border-r border-sidebar-border">
        <div className={cn("flex items-center h-14 border-b border-sidebar-border px-3 shrink-0", collapsed ? "justify-center" : "justify-between")}>
          <Logo small={collapsed} />
          <button onClick={() => onCollapse(!collapsed)} className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary transition-colors">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
        <SidebarNav collapsed={collapsed} role={role} />
        <UserFooter collapsed={collapsed} onLogout={handleLogout} />
      </motion.aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" onClick={onMobileClose} />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed left-0 top-0 h-full w-64 z-40 md:hidden flex flex-col bg-sidebar border-r border-sidebar-border">
              <div className="flex items-center justify-between h-14 border-b border-sidebar-border px-3">
                <Logo /><button onClick={onMobileClose} className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <SidebarNav collapsed={false} role={role} onClick={onMobileClose} />
              <UserFooter collapsed={false} onLogout={handleLogout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
