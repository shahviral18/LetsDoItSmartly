import { useState } from 'react';
import { Monitor, Smartphone, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { mockLoginEvents, mockUsers } from '../../mock/data';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtDate } from '../../lib/export';

const userMap = Object.fromEntries(mockUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

function DeviceIcon({ device }: { device: string }) {
  const lc = device.toLowerCase();
  if (lc.includes('iphone') || lc.includes('android') || lc.includes('samsung')) return <Smartphone size={14} className="text-slate-400" />;
  if (lc.includes('unknown')) return <Globe size={14} className="text-slate-400" />;
  return <Monitor size={14} className="text-slate-400" />;
}

export default function LoginHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [search, setSearch] = useState('');

  const filtered = mockLoginEvents.filter(e => {
    const name = userMap[e.userId] ?? '';
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase()) || e.ip.includes(search);
    return matchStatus && matchSearch;
  });

  const headers = ['User', 'Device', 'Browser', 'Location', 'IP', 'Time', 'Status'];
  const rows = filtered.map(e => [
    userMap[e.userId] ?? e.userId,
    e.device, e.browser, e.location, e.ip,
    fmtDate(e.timestamp),
    e.status,
  ]);

  return (
    <div>
      <ExportBar
        title="Login History"
        subtitle={`${mockLoginEvents.length} login events`}
        onExportCSV={() => exportCSV('login-history', headers, rows.map(r => [r]))}
        onExportPDF={() => exportPDF('login-history', 'Login History', headers, rows)}
      >
        <input
          placeholder="Search user, location, IP…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4] w-48"
        />
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['all', 'success', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                statusFilter === f ? 'bg-[#1A7DC4] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </ExportBar>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="text-left px-5 py-3 font-medium">User</th>
              <th className="text-left px-5 py-3 font-medium">Device</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell">Browser</th>
              <th className="text-left px-5 py-3 font-medium">Location</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">IP Address</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Time</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No login events found.</td></tr>
            )}
            {filtered.map(event => (
              <tr key={event.id} className={`hover:bg-slate-50 transition-colors ${event.status === 'failed' ? 'bg-red-50/40' : ''}`}>
                <td className="px-5 py-3.5 font-medium text-slate-800">
                  {userMap[event.userId] ?? event.userId}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <DeviceIcon device={event.device} />
                    {event.device}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">{event.browser}</td>
                <td className="px-5 py-3.5 text-slate-600">{event.location}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500 hidden md:table-cell">{event.ip}</td>
                <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">{fmtDate(event.timestamp)}</td>
                <td className="px-5 py-3.5">
                  {event.status === 'success' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={11} /> Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      <XCircle size={11} /> Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
