import { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { mockSecurityAlerts } from '../../mock/data';
import type { SecurityAlert } from '../../types';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtDate } from '../../lib/export';

const severityConfig = {
  high: { label: 'High', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: AlertTriangle },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: AlertCircle },
  low: { label: 'Low', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400', icon: Info },
};

const typeLabel: Record<SecurityAlert['type'], string> = {
  suspicious_login: 'Suspicious Login',
  '2sv_disabled': '2SV Disabled',
  account_compromised: 'Account Compromised',
  new_device: 'New Device',
};

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(mockSecurityAlerts);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  const filtered = alerts.filter(a =>
    filter === 'all' ? true : filter === 'resolved' ? a.resolved : !a.resolved
  );

  function resolve(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  }

  const headers = ['User', 'Domain', 'Alert Type', 'Severity', 'Message', 'Time', 'Resolved'];
  const rows = filtered.map(a => [a.userName, a.domain, typeLabel[a.type], a.severity, a.message, fmtDate(a.timestamp), a.resolved ? 'Yes' : 'No']);

  return (
    <div>
      <ExportBar
        title="Security Alerts"
        subtitle={`${alerts.filter(a => !a.resolved).length} unresolved alerts`}
        onExportCSV={() => exportCSV('security-alerts', headers, rows.map(r => [r]))}
        onExportPDF={() => exportPDF('security-alerts', 'Security Alerts', headers, rows)}
      >
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'unresolved', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                filter === f ? 'bg-[#1A7DC4] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </ExportBar>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="text-red-600 flex-shrink-0" size={22} />
          <div>
            <p className="text-xs text-red-500 font-medium uppercase tracking-wide">High Severity</p>
            <p className="text-2xl font-bold text-red-700">{alerts.filter(a => a.severity === 'high' && !a.resolved).length}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0" size={22} />
          <div>
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">Medium Severity</p>
            <p className="text-2xl font-bold text-amber-700">{alerts.filter(a => a.severity === 'medium' && !a.resolved).length}</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-emerald-600 flex-shrink-0" size={22} />
          <div>
            <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Resolved</p>
            <p className="text-2xl font-bold text-emerald-700">{alerts.filter(a => a.resolved).length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium">Domain</th>
              <th className="text-left px-5 py-3 font-medium">Alert Type</th>
              <th className="text-left px-5 py-3 font-medium">Severity</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Time</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No alerts found.</td></tr>
            )}
            {filtered.map(alert => {
              const sev = severityConfig[alert.severity];
              const SevIcon = sev.icon;
              return (
                <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{alert.userName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{alert.domain}</td>
                  <td className="px-5 py-3.5 text-slate-600">{typeLabel[alert.type]}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sev.cls}`}>
                      <SevIcon size={11} />
                      {sev.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">{fmtDate(alert.timestamp)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${alert.resolved ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {alert.resolved ? 'Resolved' : 'Open'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {!alert.resolved && (
                      <button
                        onClick={() => resolve(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-xs font-medium hover:bg-[#0D5A96] transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
