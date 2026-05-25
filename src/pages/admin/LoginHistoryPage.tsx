import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtDate } from '../../lib/export';

interface LoginEntry {
  id?: number;
  actor_name?: string;
  actor_role?: string;
  action?: string;
  detail?: string;
  ip_address?: string;
  created_at: string;
  // session-based fields
  user_name?: string;
  user_type?: string;
  user_agent?: string;
  domain_name?: string;
}

function DeviceIcon({ ua }: { ua?: string }) {
  const lc = (ua ?? '').toLowerCase();
  if (lc.includes('mobile') || lc.includes('iphone') || lc.includes('android')) return <Smartphone size={14} className="text-slate-400" />;
  if (!ua || ua === '') return <Globe size={14} className="text-slate-400" />;
  return <Monitor size={14} className="text-slate-400" />;
}

function parseDevice(ua?: string): string {
  if (!ua) return 'Unknown';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Desktop';
}

function parseBrowser(ua?: string): string {
  if (!ua) return '—';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  if (/Edge\//.test(ua)) return 'Edge';
  return 'Browser';
}

export default function LoginHistoryPage() {
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: LoginEntry[] }>('/security/login-history')
      .then(r => setEntries(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(e => {
    const name = (e.actor_name ?? e.user_name ?? '').toLowerCase();
    const ip   = e.ip_address ?? '';
    const q    = search.toLowerCase();
    return !q || name.includes(q) || ip.includes(q);
  });

  const headers = ['User', 'Role', 'Device', 'Browser', 'IP', 'Time'];
  const rows = filtered.map(e => [
    e.actor_name ?? e.user_name ?? '—',
    e.actor_role ?? e.user_type ?? '—',
    parseDevice(e.user_agent),
    parseBrowser(e.user_agent),
    e.ip_address ?? '—',
    fmtDate(e.created_at),
  ]);

  return (
    <div>
      <ExportBar
        title="Login History"
        subtitle={loading ? 'Loading…' : `${filtered.length} login events`}
        onExportCSV={() => exportCSV('login-history', headers, rows)}
        onExportPDF={() => exportPDF('login-history', 'Login History', headers, rows)}
      >
        <div className="relative">
          <input
            placeholder="Search by name or IP…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-3 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4] w-48"
          />
        </div>
      </ExportBar>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1A7DC4]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Role</th>
                <th className="text-left px-5 py-3 font-medium">Device</th>
                <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Browser</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">IP</th>
                <th className="text-left px-5 py-3 font-medium">Time</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No login events found.</td></tr>
              )}
              {filtered.map((e, i) => (
                <tr key={e.id ?? i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{e.actor_name ?? e.user_name ?? '—'}</p>
                    {e.domain_name && <p className="text-xs text-slate-400">{e.domain_name}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell capitalize">
                    {(e.actor_role ?? e.user_type ?? '—').replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <DeviceIcon ua={e.user_agent} />
                      <span>{parseDevice(e.user_agent)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">{parseBrowser(e.user_agent)}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500 hidden md:table-cell">{e.ip_address ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(e.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 size={12} /> Success
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
