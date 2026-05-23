import type { AuthUser, BillingEntity, PortalUser, Invoice, SecurityAlert, LoginEvent, SharedDrive } from '../types';

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

export const mockUsers: PortalUser[] = [
  { id: 'u1', firstName: 'Rohan', lastName: 'Shah', email: 'rohan@abc.com', domain: 'abc.com', plan: 'basic', status: 'active', lastLogin: '2026-05-23T10:30:00Z', twoSVEnabled: true, storageUsed: '8 GB', storageTotal: '15 GB', createdAt: '2025-01-15' },
  { id: 'u2', firstName: 'Meera', lastName: 'Patel', email: 'meera@abc.com', domain: 'abc.com', plan: 'basic', status: 'active', lastLogin: '2026-04-10T09:00:00Z', twoSVEnabled: false, storageUsed: '3 GB', storageTotal: '15 GB', createdAt: '2025-02-20' },
  { id: 'u3', firstName: 'Dev', lastName: 'Mehta', email: 'dev@abctech.com', domain: 'abctech.com', plan: 'pro', status: 'active', lastLogin: '2026-05-22T18:00:00Z', twoSVEnabled: true, storageUsed: '20 GB', storageTotal: '30 GB', createdAt: '2025-03-01' },
  { id: 'u4', firstName: 'Tina', lastName: 'Joshi', email: 'tina@abc.com', domain: 'abc.com', plan: 'basic', status: 'suspended', lastLogin: '2026-02-01T11:00:00Z', twoSVEnabled: false, storageUsed: '1 GB', storageTotal: '15 GB', createdAt: '2024-11-10' },
  { id: 'u5', firstName: 'Arjun', lastName: 'Rao', email: 'arjun@xyz.in', domain: 'xyz.in', plan: 'enterprise', status: 'active', lastLogin: '2026-05-24T08:00:00Z', twoSVEnabled: true, storageUsed: '45 GB', storageTotal: '50 GB', createdAt: '2024-09-05' },
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

export const mockPlans = {
  basic: { name: 'Basic', pricePerYear: 12000, color: '#64748B' },
  pro: { name: 'Pro', pricePerYear: 24000, color: '#1A7DC4' },
  enterprise: { name: 'Enterprise', pricePerYear: 36000, color: '#0D5A96' },
  premium: { name: 'Premium', pricePerYear: 48000, color: '#29ABE2' },
};
