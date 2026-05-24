import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface ApiUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  domain_name: string;
  plan_slug: string;
  storage_used_mb: number;
  storage_total_mb: number;
}

function StorageBar({ usedMb, totalMb }: { usedMb: number; totalMb: number }) {
  const pct = totalMb > 0 ? Math.min(100, Math.round((usedMb / totalMb) * 100)) : 0;
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#1A7DC4';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: pct >= 90 ? '#EF4444' : '#64748B' }}>{pct}%</span>
    </div>
  );
}

function fmtStorage(mb: number) {
  if (!mb) return '0 MB';
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export function StoragePage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ data: ApiUser[] }>('/workspace-users')
      .then(r => setUsers(r.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate by domain
  const domainMap: Record<string, { usedMb: number; totalMb: number }> = {};
  for (const u of users) {
    if (!domainMap[u.domain_name]) domainMap[u.domain_name] = { usedMb: 0, totalMb: 0 };
    domainMap[u.domain_name].usedMb  += u.storage_used_mb  ?? 0;
    domainMap[u.domain_name].totalMb += u.storage_total_mb ?? 0;
  }
  const domains = Object.entries(domainMap).sort((a, b) => b[1].usedMb - a[1].usedMb);

  const sorted = [...users].sort((a, b) => {
    const pa = a.storage_total_mb ? a.storage_used_mb / a.storage_total_mb : 0;
    const pb = b.storage_total_mb ? b.storage_used_mb / b.storage_total_mb : 0;
    return pb - pa;
  });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Storage</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Loading…' : `Storage usage across ${users.length} users`}
        </p>
      </div>

      {error && <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#1A7DC4]" />
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Domain Storage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {domains.map(([name, s]) => {
                const pct = s.totalMb > 0 ? Math.round((s.usedMb / s.totalMb) * 100) : 0;
                const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#1A7DC4';
                return (
                  <div key={name} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-800 truncate">{name}</span>
                      <span className="text-lg font-bold ml-2 shrink-0" style={{ color }}>{pct}%</span>
                    </div>
                    <StorageBar usedMb={s.usedMb} totalMb={s.totalMb} />
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-slate-500">{fmtStorage(s.usedMb)} used</span>
                      <span className="text-xs text-slate-400">{fmtStorage(s.totalMb)} total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Per-User Storage</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['User', 'Domain', 'Plan', 'Used', 'Total', 'Usage'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sorted.map(u => {
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                                style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
                                {u.first_name?.[0]}{u.last_name?.[0]}
                              </div>
                              <span className="font-medium text-slate-800">{u.first_name} {u.last_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{u.domain_name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-600">{u.plan_slug}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium">{fmtStorage(u.storage_used_mb)}</td>
                          <td className="px-4 py-3 text-slate-400">{fmtStorage(u.storage_total_mb)}</td>
                          <td className="px-4 py-3 w-40">
                            <StorageBar usedMb={u.storage_used_mb} totalMb={u.storage_total_mb} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default StoragePage;
