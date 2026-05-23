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
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/app/users', icon: Users },
    { label: 'Billing Entities', path: '/app/billing', icon: Building2 },
    { label: 'Invoices', path: '/app/invoices', icon: Receipt },
    { label: 'Buy Licenses', path: '/app/buy-licenses', icon: ShoppingCart },
    { label: 'Upgrade Plan', path: '/app/upgrade-plan', icon: ArrowUpCircle },
    { label: 'Security', path: '/app/security', icon: ShieldAlert },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ],
  admin: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/app/users', icon: Users },
    { label: 'Billing Entities', path: '/app/billing', icon: Building2 },
    { label: 'Invoices', path: '/app/invoices', icon: Receipt },
    { label: 'Buy Licenses', path: '/app/buy-licenses', icon: ShoppingCart },
    { label: 'Upgrade Plan', path: '/app/upgrade-plan', icon: ArrowUpCircle },
    { label: 'Security', path: '/app/security', icon: ShieldAlert },
  ],
  account_manager: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Clients', path: '/app/billing', icon: Building2 },
    { label: 'Invoices', path: '/app/invoices', icon: Receipt },
    { label: 'Buy Licenses', path: '/app/buy-licenses', icon: ShoppingCart },
    { label: 'Upgrade Plan', path: '/app/upgrade-plan', icon: ArrowUpCircle },
  ],
  support_admin: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Support Queue', path: '/app/support', icon: HeadphonesIcon },
    { label: 'Users', path: '/app/users', icon: Users },
    { label: 'Security', path: '/app/security', icon: ShieldAlert },
  ],
  backoffice: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', path: '/app/invoices', icon: Receipt },
    { label: 'Billing Entities', path: '/app/billing', icon: Building2 },
    { label: 'Buy Licenses', path: '/app/buy-licenses', icon: ShoppingCart },
  ],
  auditor: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'Audit Log', path: '/app/audit', icon: ClipboardList },
    { label: 'Reports', path: '/app/reports', icon: BarChart3 },
  ],
  distributor: [
    { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { label: 'My Clients', path: '/app/distributor', icon: Users },
    { label: 'Clients', path: '/app/billing', icon: Building2 },
    { label: 'Reports', path: '/app/reports', icon: BarChart3 },
  ],
  domain_owner: [
    { label: 'Dashboard', path: '/app/domain-dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/app/users', icon: Users },
    { label: 'Storage', path: '/app/storage', icon: HardDrive },
    { label: 'Shared Drives', path: '/app/drives', icon: FolderOpen },
    { label: 'Domains', path: '/app/domains', icon: Globe },
  ],
};

export const roleDashboards: Record<Role, string> = {
  super_admin: '/app/dashboard',
  admin: '/app/dashboard',
  account_manager: '/app/dashboard',
  support_admin: '/app/dashboard',
  backoffice: '/app/dashboard',
  auditor: '/app/dashboard',
  distributor: '/app/dashboard',
  domain_owner: '/app/dashboard',
};

export function getRoleDashboard(role: Role): string {
  return roleDashboards[role];
}
