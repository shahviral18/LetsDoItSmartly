import type { AuthUser, BillingEntity, PortalUser, Invoice, SecurityAlert, LoginEvent, SharedDrive, RenewalInfo, DistributorClient, CommissionPayout, Coupon, AuditLogEntry } from '../types';

export const mockAuthUsers: Record<string, AuthUser> = {
  super_admin: { id: '1', name: 'Viral Shah', email: 'viral@technodoc.in', role: 'super_admin' },
  admin: { id: '2', name: 'Priya Mehta', email: 'priya@technodoc.in', role: 'admin' },
  account_manager: { id: '3', name: 'Raj Patel', email: 'raj@technodoc.in', role: 'account_manager' },
  support_admin: { id: '4', name: 'Sneha Joshi', email: 'sneha@technodoc.in', role: 'support_admin' },
  backoffice: { id: '5', name: 'Amit Sharma', email: 'amit@technodoc.in', role: 'backoffice' },
  auditor: { id: '6', name: 'Neha Gupta', email: 'neha@technodoc.in', role: 'auditor' },
  distributor: { id: '7', name: 'Kiran Desai', email: 'kiran@distributor.com', role: 'distributor' },
  domain_owner: { id: '8', name: 'Ankit Verma', email: 'ankit@abcpvtltd.com', role: 'domain_owner' },
};

export const mockBillingEntities: BillingEntity[] = [
  {
    id: 'be1',
    name: 'ABC Pvt Ltd',
    gst: '27AABCU9603R1ZX',
    domains: [
      { id: 'd1', name: 'abc.com', billingEntityId: 'be1', ou: 'defaultOU/abc/b', userCount: 6, storageUsed: '45 GB', storageTotal: '90 GB' },
      { id: 'd2', name: 'abctech.com', billingEntityId: 'be1', ou: 'defaultOU/abc/p', userCount: 2, storageUsed: '12 GB', storageTotal: '60 GB' },
    ],
    licensePool: {
      billingEntityId: 'be1',
      basic: { allocated: 10, used: 6 },
      pro: { allocated: 4, used: 2 },
      enterprise: { allocated: 0, used: 0 },
      premium: { allocated: 0, used: 0 },
    },
  },
  {
    id: 'be2',
    name: 'XYZ Ltd',
    gst: '29AABCX1234R1ZY',
    domains: [
      { id: 'd3', name: 'xyz.in', billingEntityId: 'be2', ou: 'defaultOU/xyz/e', userCount: 8, storageUsed: '78 GB', storageTotal: '120 GB' },
    ],
    licensePool: {
      billingEntityId: 'be2',
      basic: { allocated: 0, used: 0 },
      pro: { allocated: 0, used: 0 },
      enterprise: { allocated: 10, used: 8 },
      premium: { allocated: 2, used: 1 },
    },
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv1', number: 'LDIS-0001', billingEntity: 'ABC Pvt Ltd', amount: 12000, status: 'paid', date: '2025-01-15', dueDate: '2025-01-30',
    items: [{ plan: 'Basic Plan', description: 'Annual subscription — 10 licenses', rate: 12000, qty: 1, discount: 0, net: 12000 }],
  },
  {
    id: 'inv2', number: 'LDIS-0002', billingEntity: 'ABC Pvt Ltd', amount: 1500, status: 'paid', date: '2025-06-10', dueDate: '2025-06-25',
    items: [{ plan: 'Pro Plan', description: 'Charged on pro-rata basis for 7.2 months', rate: 24000, qty: 1, discount: 10800, net: 1500 }],
  },
  {
    id: 'inv3', number: 'LDIS-0003', billingEntity: 'XYZ Ltd', amount: 36000, status: 'pending', date: '2026-05-01', dueDate: '2026-05-15',
    items: [{ plan: 'Enterprise Plan', description: 'Annual renewal — 10 licenses', rate: 36000, qty: 1, discount: 0, net: 36000 }],
  },
];

export const mockSecurityAlerts: SecurityAlert[] = [
  { id: 'sa1', userId: 'u2', userName: 'Meera Patel', domain: 'abc.com', type: '2sv_disabled', severity: 'high', message: '2-Step Verification is disabled', timestamp: '2026-05-23T14:00:00Z', resolved: false },
  { id: 'sa2', userId: 'u5', userName: 'Arjun Rao', domain: 'xyz.in', type: 'suspicious_login', severity: 'high', message: 'Login from new location: Russia', timestamp: '2026-05-24T02:30:00Z', resolved: false },
  { id: 'sa3', userId: 'u1', userName: 'Rohan Shah', domain: 'abc.com', type: 'new_device', severity: 'low', message: 'New device signed in: iPhone 15', timestamp: '2026-05-22T20:00:00Z', resolved: true },
];

export const mockLoginEvents: LoginEvent[] = [
  { id: 'le1', userId: 'u1', device: 'MacBook Pro', browser: 'Chrome 124', location: 'Mumbai, IN', ip: '103.21.xx.xx', timestamp: '2026-05-23T10:30:00Z', status: 'success' },
  { id: 'le2', userId: 'u1', device: 'iPhone 15', browser: 'Safari 17', location: 'Mumbai, IN', ip: '103.21.xx.xx', timestamp: '2026-05-22T20:00:00Z', status: 'success' },
  { id: 'le3', userId: 'u2', device: 'Windows PC', browser: 'Edge 122', location: 'Pune, IN', ip: '49.35.xx.xx', timestamp: '2026-04-10T09:00:00Z', status: 'success' },
  { id: 'le4', userId: 'u5', device: 'Unknown', browser: 'Unknown', location: 'Moscow, RU', ip: '185.xx.xx.xx', timestamp: '2026-05-24T02:30:00Z', status: 'failed' },
];

export const mockSharedDrives: SharedDrive[] = [
  { id: 'sd1', name: 'Marketing Assets', createdBy: 'rohan@abc.com', createdAt: '2024-06-01', size: '12 GB', membersCount: 5 },
  { id: 'sd2', name: 'Finance Docs', createdBy: 'meera@abc.com', createdAt: '2024-09-15', size: '3 GB', membersCount: 3 },
  { id: 'sd3', name: 'Product Roadmap', createdBy: 'dev@abctech.com', createdAt: '2025-01-10', size: '800 MB', membersCount: 8 },
];

export const mockUsers: PortalUser[] = [
  { id: 'u1', firstName: 'Rohan', lastName: 'Shah', email: 'rohan@abc.com', domain: 'abc.com', plan: 'basic', status: 'active', lastLogin: '2026-05-23T10:30:00Z', twoSVEnabled: true, storageUsed: '8 GB', storageTotal: '15 GB', createdAt: '2025-01-15' },
  { id: 'u2', firstName: 'Meera', lastName: 'Patel', email: 'meera@abc.com', domain: 'abc.com', plan: 'basic', status: 'active', lastLogin: '2026-04-10T09:00:00Z', twoSVEnabled: false, storageUsed: '3 GB', storageTotal: '15 GB', createdAt: '2025-02-20' },
  { id: 'u3', firstName: 'Dev', lastName: 'Mehta', email: 'dev@abctech.com', domain: 'abctech.com', plan: 'pro', status: 'active', lastLogin: '2026-05-22T18:00:00Z', twoSVEnabled: true, storageUsed: '20 GB', storageTotal: '30 GB', createdAt: '2025-03-01' },
  { id: 'u4', firstName: 'Tina', lastName: 'Joshi', email: 'tina@abc.com', domain: 'abc.com', plan: 'basic', status: 'suspended', lastLogin: '2026-02-01T11:00:00Z', twoSVEnabled: false, storageUsed: '1 GB', storageTotal: '15 GB', createdAt: '2024-11-10' },
  { id: 'u5', firstName: 'Arjun', lastName: 'Rao', email: 'arjun@xyz.in', domain: 'xyz.in', plan: 'enterprise', status: 'active', lastLogin: '2026-05-24T08:00:00Z', twoSVEnabled: true, storageUsed: '45 GB', storageTotal: '50 GB', createdAt: '2024-09-05' },
  { id: 'u6', firstName: 'Priya', lastName: 'Nair', email: 'priya@xyz.in', domain: 'xyz.in', plan: 'enterprise', status: 'active', lastLogin: '2026-05-20T14:00:00Z', twoSVEnabled: true, storageUsed: '30 GB', storageTotal: '50 GB', createdAt: '2024-10-12' },
  { id: 'u7', firstName: 'Karan', lastName: 'Kapoor', email: 'karan@abc.com', domain: 'abc.com', plan: 'basic', status: 'pending', lastLogin: undefined, twoSVEnabled: false, storageUsed: '0 GB', storageTotal: '15 GB', createdAt: '2026-05-20' },
];

export const mockPlans = {
  basic: { name: 'Basic', pricePerYear: 12000, color: '#64748B' },
  pro: { name: 'Pro', pricePerYear: 24000, color: '#1A7DC4' },
  enterprise: { name: 'Enterprise', pricePerYear: 36000, color: '#0D5A96' },
  premium: { name: 'Premium', pricePerYear: 48000, color: '#29ABE2' },
};

// Extended mock data for Track 2 — User & Domain Management

export interface EmailAlias {
  id: string;
  userId: string;
  alias: string;
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupName: string;
  groupEmail: string;
  role: 'member' | 'manager' | 'owner';
}

export interface AccountEvent {
  id: string;
  userId: string;
  type: 'created' | 'suspended' | 'reactivated' | 'plan_changed' | 'password_reset' | 'login_failed' | '2sv_enabled' | '2sv_disabled';
  description: string;
  timestamp: string;
  actor?: string;
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export const mockEmailAliases: EmailAlias[] = [
  { id: 'ea1', userId: 'u1', alias: 'r.shah@abc.com' },
  { id: 'ea2', userId: 'u1', alias: 'rohanshah@abc.com' },
  { id: 'ea3', userId: 'u2', alias: 'mpatel@abc.com' },
  { id: 'ea4', userId: 'u3', alias: 'devmehta@abctech.com' },
  { id: 'ea5', userId: 'u5', alias: 'a.rao@xyz.in' },
];

export const mockGroups: GroupMembership[] = [
  { id: 'g1', userId: 'u1', groupName: 'Sales Team', groupEmail: 'sales@abc.com', role: 'manager' },
  { id: 'g2', userId: 'u1', groupName: 'All Staff', groupEmail: 'all@abc.com', role: 'member' },
  { id: 'g3', userId: 'u2', groupName: 'Finance', groupEmail: 'finance@abc.com', role: 'owner' },
  { id: 'g4', userId: 'u2', groupName: 'All Staff', groupEmail: 'all@abc.com', role: 'member' },
  { id: 'g5', userId: 'u3', groupName: 'Engineering', groupEmail: 'eng@abctech.com', role: 'owner' },
  { id: 'g6', userId: 'u5', groupName: 'Leadership', groupEmail: 'leadership@xyz.in', role: 'member' },
  { id: 'g7', userId: 'u5', groupName: 'Engineering', groupEmail: 'eng@xyz.in', role: 'manager' },
];

export const mockAccountEvents: AccountEvent[] = [
  { id: 'ae1', userId: 'u1', type: 'created', description: 'Account created', timestamp: '2025-01-15T09:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae2', userId: 'u1', type: '2sv_enabled', description: '2-Step Verification enabled', timestamp: '2025-01-16T10:00:00Z', actor: 'rohan@abc.com' },
  { id: 'ae3', userId: 'u1', type: 'plan_changed', description: 'Plan changed: Free → Basic', timestamp: '2025-01-20T11:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae4', userId: 'u2', type: 'created', description: 'Account created', timestamp: '2025-02-20T09:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae5', userId: 'u2', type: '2sv_disabled', description: '2-Step Verification disabled', timestamp: '2026-03-10T14:00:00Z', actor: 'meera@abc.com' },
  { id: 'ae6', userId: 'u4', type: 'created', description: 'Account created', timestamp: '2024-11-10T09:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae7', userId: 'u4', type: 'login_failed', description: 'Multiple failed login attempts (5)', timestamp: '2026-01-15T22:00:00Z' },
  { id: 'ae8', userId: 'u4', type: 'suspended', description: 'Account suspended due to policy violation', timestamp: '2026-02-01T09:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae9', userId: 'u5', type: 'created', description: 'Account created', timestamp: '2024-09-05T09:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae10', userId: 'u5', type: 'plan_changed', description: 'Plan changed: Basic → Enterprise', timestamp: '2024-10-01T11:00:00Z', actor: 'viral@technodoc.in' },
  { id: 'ae11', userId: 'u5', type: '2sv_enabled', description: '2-Step Verification enabled', timestamp: '2024-10-02T09:00:00Z', actor: 'arjun@xyz.in' },
];

export const mockDevices: Device[] = [
  { id: 'dv1', userId: 'u1', name: 'MacBook Pro', type: 'desktop', os: 'macOS 15.2', browser: 'Chrome 124', location: 'Mumbai, IN', ip: '103.21.xx.xx', lastActive: '2026-05-23T10:30:00Z', isCurrent: true },
  { id: 'dv2', userId: 'u1', name: 'iPhone 15', type: 'mobile', os: 'iOS 17.4', browser: 'Safari 17', location: 'Mumbai, IN', ip: '103.21.xx.xx', lastActive: '2026-05-22T20:00:00Z', isCurrent: false },
  { id: 'dv3', userId: 'u2', name: 'Windows PC', type: 'desktop', os: 'Windows 11', browser: 'Edge 122', location: 'Pune, IN', ip: '49.35.xx.xx', lastActive: '2026-04-10T09:00:00Z', isCurrent: true },
  { id: 'dv4', userId: 'u3', name: 'MacBook Air', type: 'desktop', os: 'macOS 15.1', browser: 'Chrome 123', location: 'Bengaluru, IN', ip: '122.45.xx.xx', lastActive: '2026-05-22T18:00:00Z', isCurrent: true },
  { id: 'dv5', userId: 'u3', name: 'iPad Pro', type: 'tablet', os: 'iPadOS 17.4', browser: 'Safari 17', location: 'Bengaluru, IN', ip: '122.45.xx.xx', lastActive: '2026-05-20T10:00:00Z', isCurrent: false },
  { id: 'dv6', userId: 'u5', name: 'ThinkPad X1', type: 'desktop', os: 'Windows 11', browser: 'Chrome 124', location: 'Hyderabad, IN', ip: '117.xx.xx.xx', lastActive: '2026-05-24T08:00:00Z', isCurrent: true },
  { id: 'dv7', userId: 'u5', name: 'Samsung S24', type: 'mobile', os: 'Android 14', browser: 'Chrome Mobile', location: 'Hyderabad, IN', ip: '117.xx.xx.xx', lastActive: '2026-05-23T19:00:00Z', isCurrent: false },
];

export const mockDriveMembers: Record<string, Array<{ email: string; role: 'manager' | 'content manager' | 'contributor' | 'viewer' }>> = {
  sd1: [
    { email: 'rohan@abc.com', role: 'manager' },
    { email: 'meera@abc.com', role: 'content manager' },
    { email: 'tina@abc.com', role: 'contributor' },
    { email: 'karan@abc.com', role: 'viewer' },
    { email: 'dev@abctech.com', role: 'viewer' },
  ],
  sd2: [
    { email: 'meera@abc.com', role: 'manager' },
    { email: 'rohan@abc.com', role: 'viewer' },
    { email: 'tina@abc.com', role: 'contributor' },
  ],
  sd3: [
    { email: 'dev@abctech.com', role: 'manager' },
    { email: 'rohan@abc.com', role: 'contributor' },
    { email: 'arjun@xyz.in', role: 'viewer' },
    { email: 'priya@xyz.in', role: 'viewer' },
    { email: 'meera@abc.com', role: 'viewer' },
    { email: 'tina@abc.com', role: 'viewer' },
    { email: 'karan@abc.com', role: 'viewer' },
    { email: 'priya@technodoc.in', role: 'viewer' },
  ],
};

export const mockRenewals: RenewalInfo[] = [
  { billingEntityId: 'be1', billingEntityName: 'ABC Pvt Ltd', renewalDate: '2026-06-10', daysUntilRenewal: 17, totalAmount: 13500 },
  { billingEntityId: 'be2', billingEntityName: 'XYZ Ltd', renewalDate: '2026-08-15', daysUntilRenewal: 83, totalAmount: 38000 },
];

export const mockDistributorClients: DistributorClient[] = [
  {
    id: 'dc1', name: 'ABC Pvt Ltd', gst: '27AABCU9603R1ZX', contactEmail: 'ankit@abcpvtltd.com',
    renewalDate: '2026-06-10', totalLicenses: 14, activePlans: { basic: 10, pro: 4 },
    annualValue: 13500, commissionRate: 12,
  },
  {
    id: 'dc2', name: 'XYZ Ltd', gst: '29AABCX1234R1ZY', contactEmail: 'finance@xyzltd.com',
    renewalDate: '2026-08-15', totalLicenses: 12, activePlans: { enterprise: 10, premium: 2 },
    annualValue: 38000, commissionRate: 15,
  },
  {
    id: 'dc3', name: 'Delta Corp', gst: '22AABCD4567R1ZM', contactEmail: 'ops@deltacorp.io',
    renewalDate: '2026-11-01', totalLicenses: 20, activePlans: { pro: 15, enterprise: 5 },
    annualValue: 54000, commissionRate: 12,
  },
  {
    id: 'dc4', name: 'Sigma Infotech', contactEmail: 'billing@sigmait.com',
    renewalDate: '2027-01-20', totalLicenses: 8, activePlans: { basic: 8 },
    annualValue: 9600, commissionRate: 10,
  },
];

export const mockCommissions: CommissionPayout[] = [
  { id: 'cp1', period: 'Q1 2026 (Jan–Mar)', invoiceAmount: 51500, commissionRate: 12, commissionEarned: 6180, status: 'paid', paidDate: '2026-04-05' },
  { id: 'cp2', period: 'Q4 2025 (Oct–Dec)', invoiceAmount: 38000, commissionRate: 12, commissionEarned: 4560, status: 'paid', paidDate: '2026-01-08' },
  { id: 'cp3', period: 'Q2 2026 (Apr–May)', invoiceAmount: 24600, commissionRate: 12, commissionEarned: 2952, status: 'pending' },
];

export const mockCoupons: Record<string, { discount: number; type: 'percent' | 'flat'; label: string }> = {
  SAVE10: { discount: 10, type: 'percent', label: '10% off' },
  FLAT500: { discount: 500, type: 'flat', label: '₹500 off' },
  NEWBIZ20: { discount: 20, type: 'percent', label: '20% off for new accounts' },
};

export const mockCouponList: Coupon[] = [
  { code: 'SAVE10', discount: 10, type: 'percent', label: '10% off', active: true, usageCount: 34 },
  { code: 'FLAT500', discount: 500, type: 'flat', label: '₹500 off', active: true, usageCount: 12 },
  { code: 'NEWBIZ20', discount: 20, type: 'percent', label: '20% off for new accounts', active: false, usageCount: 7 },
  { code: 'WELCOME15', discount: 15, type: 'percent', label: '15% welcome discount', active: true, usageCount: 21 },
];

export const mockAuditLog: AuditLogEntry[] = [
  { id: 'al1', actorId: '1', actorName: 'Viral Shah', actorRole: 'super_admin', action: 'user_created', target: 'rohan@abc.com', detail: 'New user account created under ABC Pvt Ltd', timestamp: '2026-05-24T09:15:00Z' },
  { id: 'al2', actorId: '1', actorName: 'Viral Shah', actorRole: 'super_admin', action: 'pricing_updated', target: 'Enterprise Plan', detail: 'Annual price updated: ₹34,000 → ₹36,000', timestamp: '2026-05-23T16:30:00Z' },
  { id: 'al3', actorId: '2', actorName: 'Priya Mehta', actorRole: 'admin', action: 'user_suspended', target: 'tina@abc.com', detail: 'Account suspended for policy violation', timestamp: '2026-05-23T11:00:00Z' },
  { id: 'al4', actorId: '1', actorName: 'Viral Shah', actorRole: 'super_admin', action: 'coupon_created', target: 'WELCOME15', detail: 'New coupon created: 15% welcome discount', timestamp: '2026-05-22T14:45:00Z' },
  { id: 'al5', actorId: '5', actorName: 'Amit Sharma', actorRole: 'backoffice', action: 'license_assigned', target: 'arjun@xyz.in', detail: 'Enterprise license assigned to user', timestamp: '2026-05-22T10:00:00Z' },
  { id: 'al6', actorId: '6', actorName: 'Neha Gupta', actorRole: 'auditor', action: 'export_downloaded', target: 'Login History', detail: 'CSV export downloaded for all domains', timestamp: '2026-05-21T17:20:00Z' },
  { id: 'al7', actorId: '4', actorName: 'Sneha Joshi', actorRole: 'support_admin', action: 'alert_resolved', target: 'sa1 — Meera Patel', detail: 'Resolved 2SV disabled alert after user confirmation', timestamp: '2026-05-21T14:10:00Z' },
  { id: 'al8', actorId: '1', actorName: 'Viral Shah', actorRole: 'super_admin', action: 'referral_toggled', target: 'Referral System', detail: 'Referral system toggled ON', timestamp: '2026-05-20T09:00:00Z' },
  { id: 'al9', actorId: '2', actorName: 'Priya Mehta', actorRole: 'admin', action: 'plan_changed', target: 'arjun@xyz.in', detail: 'Plan changed: Basic → Enterprise', timestamp: '2026-05-19T11:30:00Z' },
  { id: 'al10', actorId: '5', actorName: 'Amit Sharma', actorRole: 'backoffice', action: 'invoice_generated', target: 'LDIS-0003', detail: 'Invoice generated for XYZ Ltd renewal — ₹36,000', timestamp: '2026-05-01T10:00:00Z' },
  { id: 'al11', actorId: '1', actorName: 'Viral Shah', actorRole: 'super_admin', action: 'coupon_deleted', target: 'EXPIRED50', detail: 'Expired coupon removed from system', timestamp: '2026-04-30T15:00:00Z' },
  { id: 'al12', actorId: '3', actorName: 'Raj Patel', actorRole: 'account_manager', action: 'domain_added', target: 'abctech.com', detail: 'New domain added to ABC Pvt Ltd billing entity', timestamp: '2026-04-28T09:45:00Z' },
];

import type { BccRequest } from '../types';

export const mockBccRequests: BccRequest[] = [
  {
    id: 'bcc1',
    domain: 'abc.com',
    ouPath: 'defaultOU/abc/b',
    billingEntityId: 'be1',
    affectedUsers: ['sales@abc.com', 'purchase@abc.com'],
    surveillanceEmail: 'data@abc.com',
    directions: ['outbound', 'inbound'],
    status: 'completed',
    requestedBy: 'u8',
    requestedAt: '2026-05-20T10:00:00Z',
    completedBy: 'Sneha Joshi',
    completedAt: '2026-05-21T14:30:00Z',
    notes: 'Configured for Basic OU only.',
  },
  {
    id: 'bcc2',
    domain: 'abctech.com',
    ouPath: 'defaultOU/abc/p',
    billingEntityId: 'be1',
    affectedUsers: 'all',
    surveillanceEmail: 'compliance@abc.com',
    directions: ['outbound', 'internal_sending', 'inbound', 'internal_receiving'],
    status: 'pending',
    requestedBy: 'u8',
    requestedAt: '2026-05-24T08:00:00Z',
  },
  {
    id: 'bcc3',
    domain: 'xyz.in',
    ouPath: 'defaultOU/xyz/e',
    billingEntityId: 'be2',
    affectedUsers: ['arjun@xyz.in'],
    surveillanceEmail: 'audit@xyz.in',
    directions: ['outbound'],
    status: 'in_progress',
    requestedBy: 'u5',
    requestedAt: '2026-05-23T16:00:00Z',
    notes: 'Awaiting Google Admin access.',
  },
];
