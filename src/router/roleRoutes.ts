import type { Role } from '../types';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  ShieldAlert,
  HeadphonesIcon,
  ClipboardList,
  BarChart3,
  Globe,
  Settings,
  ShoppingCart,
  ArrowUpCircle,
  HardDrive,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const roleNavItems: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard',        path: '/dashboard',         icon: LayoutDashboard },
    { label: 'Users',            path: '/users',             icon: Users },
    { label: 'Billing Entities', path: '/distributors',      icon: Building2 },
    { label: 'Invoices',         path: '/billing/invoices',  icon: Receipt },
    { label: 'Buy Licenses',     path: '/billing/buy',       icon: ShoppingCart },
    { label: 'Upgrade Plan',     path: '/billing/upgrade',   icon: ArrowUpCircle },
    { label: 'Security',         path: '/security/alerts',   icon: ShieldAlert },
    { label: 'Settings',         path: '/admin/super',       icon: Settings },
  ],
  admin: [
    { label: 'Dashboard',        path: '/dashboard',         icon: LayoutDashboard },
    { label: 'Users',            path: '/users',             icon: Users },
    { label: 'Billing Entities', path: '/distributors',      icon: Building2 },
    { label: 'Invoices',         path: '/billing/invoices',  icon: Receipt },
    { label: 'Buy Licenses',     path: '/billing/buy',       icon: ShoppingCart },
    { label: 'Upgrade Plan',     path: '/billing/upgrade',   icon: ArrowUpCircle },
    { label: 'Security',         path: '/security/alerts',   icon: ShieldAlert },
  ],
  account_manager: [
    { label: 'Dashboard',    path: '/dashboard',        icon: LayoutDashboard },
    { label: 'Clients',      path: '/distributors',     icon: Building2 },
    { label: 'Invoices',     path: '/billing/invoices', icon: Receipt },
    { label: 'Buy Licenses', path: '/billing/buy',      icon: ShoppingCart },
    { label: 'Upgrade Plan', path: '/billing/upgrade',  icon: ArrowUpCircle },
  ],
  support_admin: [
    { label: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
    { label: 'Support Queue',   path: '/surveillance',    icon: HeadphonesIcon },
    { label: 'Users',           path: '/users',           icon: Users },
    { label: 'Security',        path: '/security/alerts', icon: ShieldAlert },
  ],
  backoffice: [
    { label: 'Dashboard',        path: '/dashboard',        icon: LayoutDashboard },
    { label: 'Invoices',         path: '/billing/invoices', icon: Receipt },
    { label: 'Billing Entities', path: '/distributors',     icon: Building2 },
    { label: 'Buy Licenses',     path: '/billing/buy',      icon: ShoppingCart },
  ],
  auditor: [
    { label: 'Dashboard', path: '/dashboard',      icon: LayoutDashboard },
    { label: 'Audit Log', path: '/security/audit', icon: ClipboardList },
    { label: 'Reports',   path: '/reports',         icon: BarChart3 },
  ],
  distributor: [
    { label: 'Dashboard',  path: '/dashboard',           icon: LayoutDashboard },
    { label: 'My Clients', path: '/distributor/clients', icon: Users },
    { label: 'Clients',    path: '/distributors',        icon: Building2 },
    { label: 'Reports',    path: '/reports',             icon: BarChart3 },
  ],
  domain_owner: [
    { label: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
    { label: 'Users',         path: '/users',         icon: Users },
    { label: 'Storage',       path: '/storage',       icon: HardDrive },
    { label: 'Shared Drives', path: '/shared-drives', icon: FolderOpen },
    { label: 'Domains',       path: '/domains',       icon: Globe },
  ],
};

export const roleDashboards: Record<Role, string> = {
  super_admin:     '/dashboard',
  admin:           '/dashboard',
  account_manager: '/dashboard',
  support_admin:   '/dashboard',
  backoffice:      '/dashboard',
  auditor:         '/dashboard',
  distributor:     '/dashboard',
  domain_owner:    '/dashboard',
};

export function getRoleDashboard(role: Role): string {
  return roleDashboards[role];
}
