import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { api } from '../../lib/api';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtDate } from '../../lib/export';

interface Alert {
  id: string;
  user_name: string;
  email: string;
  domain: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  resolved: boolean;
  resolved_by?: string;
  resolution_note?: string;
  resolved_at?: string;
  timestamp: string;
}

const severityConfig = {
  high:   { label: 'High',   cls: 'bg-red-100 text-red-700',    icon: AlertTriangle },
  medium: { label: 'Medium', cls: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  low:    { label: 'Low',    cls: 'bg-blue-100 text-blue-700',   icon: Info },
};

const typeLabel: Record<string, string> = {
  '2sv_disabled':      '2SV Disabled',
  suspicious_login:    'Suspicious Login',
  account_compromised: 'Account Compromised',
  new_device:          'New Device',
  stale_account:       'Stale Account',
  account_suspended:   'Suspended',
  never_logged_in:     'Never Logged In',
  storage_critical:    'Storage Critical',
  storage_warning:     'Storage Warning',
  new_unverified:      'Pending Activation',
};

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  // Resolve modal state
  const [resolveTarget, setResolveTarget] = useState<Alert | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveErr, setResolveErr] = useState('');

  function loadAlerts() {
    setLoading(true);
    api.get<{ data: Alert[] }>('/security/alerts')
      .then(r => setAlerts(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAlerts(); }, []);

  async function submitResolve() {
    if (!resolveTarget || !resolveNote.trim()) return;
    setResolving(true);
    setResolveErr('');
    try {
      await api.patch(`/security/alerts/${resolveTarget.id}/resolve`, { note: resolveNote.trim() });
      setResolveTarget(null);
      setResolveNote('');
      loadAlerts();
    } catch (e) {
      setResolveErr(e instanceof Error ? e.message : 'Failed to resolve');
    } finally {
      setResolving(false);
    }
  }

  const filtered = alerts.filter(a =>
    filter === 'all' ? true : filter === 'resolved' ? a.resolved : !a.resolved
  );

  const headers = ['User', 'Email', 'Domain', 'Alert Type', 'Severity', 'Time', 'Status'];
  const rows = filtered.map(a => [a.user_name, a.email, a.domain, typeLabel[a.type] ?? a.type, a.severity, fmtDate(a.timestamp), a.resolved ? 'Resolved' : 'Open']);

  return (
    <div>
      <ExportBar
        title="Security Alerts"
        subtitle={loading ? 'Loading…' : `${alerts.filter(a => !a.resolved).length} unresolved alerts`}
        onExportCSV={() => exportCSV('security-alerts', headers, rows)}
        onExportPDF={() => exportPDF('security-alerts', 'Security Alerts', headers, rows)}
      >
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'unresolved', 'resolved'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${filter === f ? 'bg-[#1A7DC4] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
      </ExportBar>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="text-red-600 shrink-0" size={22} />
          <div>
            <p className="text-xs text-red-500 font-medium uppercase tracking-wide">High Severity</p>
            <p className="text-2xl font-bold text-red-700">{alerts.filter(a => a.severity === 'high' && !a.resolved).length}</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-600 shrink-0" size={22} />
          <div>
            <p className="text-xs text-amber-500 font-medium uppercase tracking-wide">Medium Severity</p>
            <p className="text-2xl font-bold text-amber-700">{alerts.filter(a => a.severity === 'medium' && !a.resolved).length}</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-emerald-600 shrink-0" size={22} />
          <div>
            <p className="text-xs text-emerald-500 font-medium uppercase tracking-wide">Resolved</p>
            <p className="text-2xl font-bold text-emerald-700">{alerts.filter(a => a.resolved).length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1A7DC4]" /></div>
      ) : (
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
                const sev = severityConfig[alert.severity] ?? severityConfig.low;
                const SevIcon = sev.icon;
                return (
                  <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{alert.user_name}</p>
                      <p className="text-xs text-[#1A7DC4] mt-0.5">{alert.email}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{alert.domain}</td>
                    <td className="px-5 py-3.5 text-slate-600">{typeLabel[alert.type] ?? alert.type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sev.cls}`}>
                        <SevIcon size={11} />{sev.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">{fmtDate(alert.timestamp)}</td>
                    <td className="px-5 py-3.5">
                      {alert.resolved ? (
                        <div>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Resolved</span>
                          {alert.resolution_note && (
                            <p className="text-xs text-slate-400 mt-0.5 max-w-[160px] truncate" title={alert.resolution_note}>{alert.resolution_note}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Open</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {!alert.resolved && (
                        <button onClick={() => { setResolveTarget(alert); setResolveNote(''); setResolveErr(''); }}
                          className="px-3 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-xs font-medium hover:bg-[#0D5A96] transition-colors">
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
      )}

      {/* Resolve Modal */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResolveTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Resolve Alert</h3>
              <button onClick={() => setResolveTarget(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
              <p className="font-medium text-slate-700">{resolveTarget.user_name}</p>
              <p className="text-xs text-[#1A7DC4]">{resolveTarget.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">{typeLabel[resolveTarget.type] ?? resolveTarget.type} — {resolveTarget.message}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Resolution Note <span className="text-red-500">*</span></label>
              <textarea
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                placeholder="e.g. Enabled 2SV for user, contacted user to enable 2FA…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4] resize-none"
              />
              <p className="text-xs text-slate-400">This note will be saved as an audit trail.</p>
            </div>
            {resolveErr && <p className="text-sm text-red-600">{resolveErr}</p>}
            <div className="flex gap-3">
              <button onClick={() => setResolveTarget(null)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={submitResolve}
                disabled={resolving || !resolveNote.trim()}
                className="flex-1 py-2 rounded-lg bg-[#1A7DC4] text-white text-sm font-semibold hover:bg-[#0D5A96] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {resolving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
