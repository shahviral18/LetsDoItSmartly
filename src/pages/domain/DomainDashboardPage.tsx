import { useAuth } from '../../context/AuthContext';
import { mockBillingEntities, mockUsers, mockPlans } from '../../mock/data';

const planKeys = ['basic', 'pro', 'enterprise', 'premium'] as const;

const planColors: Record<string, { bg: string; text: string; bar: string }> = {
  basic:      { bg: '#F8FAFC', text: '#64748B', bar: '#94A3B8' },
  pro:        { bg: '#EFF6FF', text: '#1A7DC4', bar: '#1A7DC4' },
  enterprise: { bg: '#EEF2FF', text: '#0D5A96', bar: '#0D5A96' },
  premium:    { bg: '#F0F9FF', text: '#29ABE2', bar: '#29ABE2' },
};

export function DomainDashboardPage() {
  const { auth, currentDomainId, setCurrentDomainId } = useAuth();
  if (auth.status !== 'authenticated') return null;

  const allDomains = mockBillingEntities.flatMap(be => be.domains);
  const currentDomain = allDomains.find(d => d.id === currentDomainId) ?? allDomains[0];
  const billingEntity = mockBillingEntities.find(be =>
    be.domains.some(d => d.id === currentDomain?.id)
  );

  const domainUsers = mockUsers.filter(u => u.domain === currentDomain?.name);
  const storageUsedNum = parseFloat(currentDomain?.storageUsed ?? '0');
  const storageTotalNum = parseFloat(currentDomain?.storageTotal ?? '1');
  const storagePercent = Math.round((storageUsedNum / storageTotalNum) * 100);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Domain Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {billingEntity?.name} · {currentDomain?.ou}
          </p>
        </div>

        {/* Domain switcher */}
        <div className="flex items-center gap-2">
          {allDomains.map(d => (
            <button
              key={d.id}
              onClick={() => setCurrentDomainId(d.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                d.id === currentDomain?.id
                  ? 'text-white border-transparent'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              style={d.id === currentDomain?.id ? { background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)', borderColor: 'transparent' } : {}}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Users" value={String(currentDomain?.userCount ?? 0)} sub="in this domain" />
        <SummaryCard label="Active" value={String(domainUsers.filter(u => u.status === 'active').length)} sub="accounts" color="#22C55E" />
        <SummaryCard label="Suspended" value={String(domainUsers.filter(u => u.status === 'suspended').length)} sub="accounts" color="#EF4444" />
        <SummaryCard label="2SV Off" value={String(domainUsers.filter(u => !u.twoSVEnabled).length)} sub="users at risk" color="#F59E0B" />
      </div>

      {/* License pool */}
      {billingEntity && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">License Pool</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {planKeys.map(plan => {
              const pool = billingEntity.licensePool[plan];
              const colors = planColors[plan];
              const available = pool.allocated - pool.used;
              const usedPct = pool.allocated > 0 ? Math.round((pool.used / pool.allocated) * 100) : 0;
              return (
                <div
                  key={plan}
                  className="rounded-xl border border-slate-100 p-4"
                  style={{ background: colors.bg }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
                      {mockPlans[plan].name}
                    </span>
                    {pool.allocated === 0 && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                  {pool.allocated > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-slate-800">{pool.used}</div>
                      <div className="text-xs text-slate-500 mb-2">of {pool.allocated} used</div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${usedPct}%`, background: colors.bar }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-xs text-slate-400">{available} available</span>
                        <span className="text-xs font-medium" style={{ color: colors.text }}>{usedPct}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-400 mt-1">No licenses</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Storage</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${storagePercent}%`, background: storagePercent > 80 ? '#EF4444' : 'linear-gradient(90deg,#1A7DC4,#29ABE2)' }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-slate-500">{currentDomain?.storageUsed} used</span>
              <span className="text-xs text-slate-400">{currentDomain?.storageTotal} total</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: storagePercent > 80 ? '#EF4444' : '#1A7DC4' }}>
              {storagePercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Domain users quick list */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Users in {currentDomain?.name}</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {domainUsers.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No users in this domain</div>
          ) : (
            domainUsers.map(u => (
              <div key={u.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
                  >
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={u.plan} />
                  <StatusBadge status={u.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color = '#1A7DC4' }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    basic: 'bg-slate-100 text-slate-600',
    pro: 'bg-blue-50 text-blue-700',
    enterprise: 'bg-indigo-50 text-indigo-700',
    premium: 'bg-cyan-50 text-cyan-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[plan] ?? 'bg-slate-100 text-slate-600'}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    suspended: 'bg-red-50 text-red-600',
    pending: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}
