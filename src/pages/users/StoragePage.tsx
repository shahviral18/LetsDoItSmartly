import { mockUsers, mockBillingEntities } from '../../mock/data';

function parseGB(s: string): number {
  const n = parseFloat(s);
  if (s.includes('MB')) return n / 1024;
  return n;
}


function StorageBar({ used, total, warn = false }: { used: number; total: number; warn?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#1A7DC4';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: warn && pct >= 90 ? '#EF4444' : '#64748B' }}>
        {pct}%
      </span>
    </div>
  );
}

export function StoragePage() {
  const allDomains = mockBillingEntities.flatMap(be => be.domains);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Storage</h1>
        <p className="text-sm text-slate-500 mt-0.5">Storage usage across all users and domains</p>
      </div>

      {/* Domain totals */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Domain Storage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {allDomains.map(d => {
            const usedGB = parseGB(d.storageUsed);
            const totalGB = parseGB(d.storageTotal);
            const pct = Math.round((usedGB / totalGB) * 100);
            const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#1A7DC4';
            return (
              <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-800">{d.name}</span>
                  <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
                </div>
                <StorageBar used={usedGB} total={totalGB} warn />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-slate-500">{d.storageUsed} used</span>
                  <span className="text-xs text-slate-400">{d.storageTotal} total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-user table */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Per-User Storage</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['User', 'Domain', 'Plan', 'Used', 'Total', 'Usage'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...mockUsers]
                  .sort((a, b) => parseGB(b.storageUsed) / parseGB(b.storageTotal) - parseGB(a.storageUsed) / parseGB(a.storageTotal))
                  .map(u => {
                    const usedGB = parseGB(u.storageUsed);
                    const totalGB = parseGB(u.storageTotal);
                    const pct = Math.round((usedGB / totalGB) * 100);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                              style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
                            >
                              {u.firstName[0]}{u.lastName[0]}
                            </div>
                            <span className="font-medium text-slate-800">{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{u.domain}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 text-slate-600">
                            {u.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{u.storageUsed}</td>
                        <td className="px-4 py-3 text-slate-400">{u.storageTotal}</td>
                        <td className="px-4 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <StorageBar used={usedGB} total={totalGB} warn />
                            </div>
                            <span className={`text-xs font-semibold w-8 text-right ${pct >= 90 ? 'text-red-500' : 'text-slate-500'}`}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoragePage;
