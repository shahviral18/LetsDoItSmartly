import { useAuth } from '../../context/AuthContext';

const roleDescriptions: Record<string, string> = {
  super_admin: 'Full system access — manage all entities, users, billing, and configuration.',
  admin: 'Manage users, billing entities, invoices, and security alerts.',
  account_manager: 'Manage client accounts and invoices.',
  support_admin: 'Handle support tickets and review user accounts.',
  backoffice: 'Process billing and manage invoices.',
  auditor: 'Read-only access to audit logs and reports.',
  distributor: 'View your client portfolio and performance reports.',
  domain_owner: 'Manage your domain users and view usage reports.',
};

export function DashboardPage() {
  const { auth } = useAuth();
  if (auth.status !== 'authenticated') return null;

  const { user } = auth;
  const initials = user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="max-w-4xl">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 mb-6 text-white"
        style={{ background: 'linear-gradient(135deg,#1A7DC4 0%,#29ABE2 100%)' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-semibold">Welcome, {user.name.split(' ')[0]}!</h1>
            <p className="text-blue-100 text-sm mt-0.5 capitalize">
              {user.role.replace(/_/g, ' ')} · {user.email}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-blue-50 max-w-lg">
          {roleDescriptions[user.role]}
        </p>
      </div>

      {/* Placeholder stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Users', value: '16' },
          { label: 'Open Invoices', value: '3' },
          { label: 'Security Alerts', value: '2' },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 px-5 py-4"
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1A7DC4' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 mt-8 text-center">
        Dashboard content for this role will be built in subsequent tracks.
      </p>
    </div>
  );
}
