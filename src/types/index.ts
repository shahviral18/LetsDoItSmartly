export type Role =
  | 'super_admin'
  | 'admin'
  | 'account_manager'
  | 'support_admin'
  | 'backoffice'
  | 'auditor'
  | 'distributor'
  | 'domain_owner';

export type Plan = 'basic' | 'pro' | 'enterprise' | 'premium';

export type UserStatus = 'active' | 'suspended' | 'pending';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface BillingEntity {
  id: string;
  name: string;
  gst?: string;
  domains: Domain[];
  licensePool: LicensePool;
}

export interface Domain {
  id: string;
  name: string;
  billingEntityId: string;
  ou: string;
  userCount: number;
  storageUsed: string;
  storageTotal: string;
}

export interface LicensePool {
  billingEntityId: string;
  basic: { allocated: number; used: number };
  pro: { allocated: number; used: number };
  enterprise: { allocated: number; used: number };
  premium: { allocated: number; used: number };
}

export interface PortalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  domain: string;
  plan: Plan;
  status: UserStatus;
  lastLogin?: string;
  twoSVEnabled: boolean;
  storageUsed: string;
  storageTotal: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  billingEntity: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
  dueDate: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  plan: string;
  description: string;
  rate: number;
  qty: number;
  discount: number;
  net: number;
}

export interface SecurityAlert {
  id: string;
  userId: string;
  userName: string;
  domain: string;
  type: 'suspicious_login' | '2sv_disabled' | 'account_compromised' | 'new_device';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface LoginEvent {
  id: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export interface SharedDrive {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  size: string;
  membersCount: number;
}
