import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Role } from '../../types';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtDate } from '../../lib/export';

const roleColors: Record<Role, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  account_manager: 'bg-sky-100 text-sky-700',
  support_admin: 'bg-amber-100 text-amber-700',
  backoffice: 'bg-teal-100 text-teal-700',
  auditor: 'bg-slate-100 text-slate-600',
  distributor: 'bg-orange-100 text-orange-700',
  domain_owner: 'bg-emerald-100 text-emerald-700',
};


const roles: Role[] = ['super_admin', 'admin', 'account_manager', 'support_admin', 'backoffice', 'auditor', 'distributor', 'domain_owner'];

interface AuditEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  target: string;
  detail: string;
  created_at: string;
}

export default function AuditLogPage() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: AuditEntry[] }>('/audit-log')
      .then(r => setLog(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = log.filter(entry => {
    if (roleFilter !== 'all' && entry.actor_role !== roleFilter) return false;
    if (dateFrom && new Date(entry.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(entry.created_at) > new Date(dateTo + 'T23:59:59Z')) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!entry.actor_name.toLowerCase().includes(q) && !entry.target.toLowerCase().includes(q) && !entry.detail.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const headers = ['Actor', 'Role', 'Action', 'Target', 'Detail', 'Timestamp'];
  const rows = filtered.map(e => [e.actor_name, e.actor_role, e.action, e.target, e.detail, fmtDate(e.created_at)]);

  return (
    <div>
      <ExportBar
        title="Portal Audit Log"
        subtitle={loading ? 'Loading…' : `${filtered.length} of ${log.length} entries`}
        onExportCSV={() => exportCSV('audit-log', headers, rows)}
        onExportPDF={() => exportPDF('audit-log', 'Portal Audit Log', headers, rows)}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</label>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as Role | 'all')}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4] bg-white"
          >
            <option value="all">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-40">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Search</label>
          <input
            placeholder="Actor, target, detail…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4] w-full"
          />
        </div>
        <button
          onClick={() => { setRoleFilter('all'); setDateFrom(''); setDateTo(''); setSearch(''); }}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="text-left px-5 py-3 font-medium">Actor</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Action</th>
              <th className="text-left px-5 py-3 font-medium">Target</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Detail</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No log entries match your filters.</td></tr>
            )}
            {filtered.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{entry.actor_name || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[entry.actor_role as Role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {entry.actor_role?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-700">
                  {entry.action?.replace(/_/g, ' ')}
                </td>
                <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{entry.target}</td>
                <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell max-w-xs truncate">{entry.detail}</td>
                <td className="px-5 py-3.5 text-slate-400 text-xs hidden md:table-cell whitespace-nowrap">{fmtDate(entry.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
