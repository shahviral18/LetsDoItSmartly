import { Shield, History, ClipboardList, Briefcase, Settings, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockSecurityAlerts, mockAuditLog } from '../../mock/data';
import { fmtDate } from '../../lib/export';

const quickLinks = [
  { to: '/admin', label: 'Super Admin Panel', icon: Settings, desc: 'Plan pricing, referrals & coupons', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { to: '/admin/security-alerts', label: 'Security Alerts', icon: Shield, desc: 'Review & resolve security events', color: 'text-red-600 bg-red-50 border-red-100' },
  { to: '/admin/login-history', label: 'Login History', icon: History, desc: 'All portal login events', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList, desc: 'Full activity trail, filterable', color: 'text-teal-600 bg-teal-50 border-teal-100' },
  { to: '/admin/backoffice', label: 'Backoffice', icon: Briefcase, desc: 'Revenue, subscriptions & licenses', color: 'text-amber-600 bg-amber-50 border-amber-100' },
];

export default function AdminDashboard() {
  const openAlerts = mockSecurityAlerts.filter(a => !a.resolved);
  const recentLogs = [...mockAuditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of admin &amp; audit activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(({ to, label, icon: Icon, desc, color }) => (
          <Link key={to} to={to}
            className={`flex items-start gap-3 p-4 rounded-xl border ${color} hover:shadow-md transition-shadow`}>
            <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
            <ArrowRight size={16} className="mt-1 flex-shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Open Security Alerts</h3>
            <Link to="/admin/security-alerts" className="text-xs text-[#1A7DC4] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {openAlerts.length === 0 && <p className="px-5 py-6 text-sm text-slate-400 text-center">No open alerts.</p>}
            {openAlerts.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.userName}</p>
                  <p className="text-xs text-slate-500">{a.message}</p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${a.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm">Recent Audit Activity</h3>
            <Link to="/admin/audit-log" className="text-xs text-[#1A7DC4] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLogs.map(e => (
              <div key={e.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{e.actorName}</p>
                  <p className="text-xs text-slate-400">{fmtDate(e.timestamp)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{e.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
