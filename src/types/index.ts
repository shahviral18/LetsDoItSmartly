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

export interface DistributorClient {
  id: string;
  name: string;
  gst?: string;
  contactEmail: string;
  renewalDate: string;
  totalLicenses: number;
  activePlans: Partial<Record<Plan, number>>;
  annualValue: number;
  commissionRate: number;
}

export interface CommissionPayout {
  id: string;
  period: string;
  invoiceAmount: number;
  commissionRate: number;
  commissionEarned: number;
  status: 'paid' | 'pending' | 'processing';
  paidDate?: string;
}

export interface RenewalInfo {
  billingEntityId: string;
  billingEntityName: string;
  renewalDate: string;
  daysUntilRenewal: number;
  totalAmount: number;
}

export type AuditAction =
  | 'user_created'
  | 'user_suspended'
  | 'user_reactivated'
  | 'plan_changed'
  | 'license_assigned'
  | 'license_revoked'
  | 'coupon_created'
  | 'coupon_deleted'
  | 'pricing_updated'
  | 'referral_toggled'
  | 'alert_resolved'
  | 'invoice_generated'
  | 'domain_added'
  | 'export_downloaded';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: AuditAction;
  target: string;
  detail: string;
  timestamp: string;
}

export interface PlanConfig {
  plan: 'basic' | 'pro' | 'enterprise' | 'premium';
  name: string;
  pricePerYear: number;
  color: string;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'flat';
  label: string;
  active: boolean;
  usageCount: number;
}

export type BccDirection = 'outbound' | 'inbound' | 'internal_sending' | 'internal_receiving';
export type BccStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface BccRequest {
  id: string;
  domain: string;
  ouPath: string;
  billingEntityId: string;
  affectedUsers: 'all' | string[];
  surveillanceEmail: string;
  directions: BccDirection[];
  status: BccStatus;
  requestedBy: string;
  requestedAt: string;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}
