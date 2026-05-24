import { useState, useEffect } from 'react';
import { Search, Loader2, ChevronRight, Monitor, Smartphone, Globe, AlertTriangle, CheckCircle2, XCircle, LogOut, ArrowLeft, ShieldOff } from 'lucide-react';
import { api } from '../../lib/api';

interface GUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  two_sv_enabled: number;
  last_login_at?: string;
  plan_slug: string;
  domain_name: string;
}

interface LoginEvent {
  timestamp: string;
  ip_address: string;
  login_type: string;
  is_suspicious: boolean;
  event_name: string;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DeviceIcon({ type }: { type: string }) {
  const lc = type.toLowerCase();
  if (lc.includes('mobile') || lc.includes('android') || lc.includes('ios')) return <Smartphone size={14} className="text-slate-400" />;
  if (lc.includes('exchange') || lc.includes('api')) return <Globe size={14} className="text-slate-400" />;
  return <Monitor size={14} className="text-slate-400" />;
}

const planColors: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-600',
  pro: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-indigo-50 text-indigo-700',
  premium: 'bg-cyan-50 text-cyan-700',
};

export default function GoogleLoginHistoryPage() {
  const [users, setUsers] = useState<GUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GUser | null>(null);
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMsg, setSignOutMsg] = useState('');

  useEffect(() => {
    api.get<{ data: GUser[] }>('/google/users')
      .then(r => setUsers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openUser(u: GUser) {
    setSelected(u);
    setHistory([]);
    setHistError('');
    setSignOutMsg('');
    setHistLoading(true);
    api.get<{ data: LoginEvent[] }>(`/google/login-history/${encodeURIComponent(u.email)}`)
      .then(r => setHistory(r.data ?? []))
      .catch(e => setHistError(e instanceof Error ? e.message : 'Failed to load login history'))
      .finally(() => setHistLoading(false));
  }

  async function forceSignOut() {
    if (!selected) return;
    if (!confirm(`Force sign out ${selected.email} from ALL Google sessions? They will need to log in again on every device.`)) return;
    setSigningOut(true);
    setSignOutMsg('');
    try {
      await api.post(`/google/sign-out/${encodeURIComponent(selected.email)}`, {});
      setSignOutMsg(`✓ ${selected.email} has been signed out from all devices.`);
    } catch (e) {
      setSignOutMsg(`✗ ${e instanceof Error ? e.message : 'Sign out failed'}`);
    } finally {
      setSigningOut(false);
    }
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      u.domain_name.toLowerCase().includes(q);
  });

  // Detail view
  if (selected) {
    return (
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{selected.first_name} {selected.last_name}</h1>
            <p className="text-sm text-[#1A7DC4]">{selected.email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[selected.plan_slug] ?? 'bg-slate-100 text-slate-600'}`}>
              {selected.plan_slug}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.two_sv_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {selected.two_sv_enabled ? '2SV ✓' : '2SV ✗'}
            </span>
          </div>
        </div>

        {/* Force sign out */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Force Sign Out</p>
              <p className="text-xs text-slate-500 mt-0.5">Signs this user out of all Google sessions on every device immediately.</p>
            </div>
            <button
              onClick={forceSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {signingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Force Sign Out
            </button>
          </div>
          {signOutMsg && (
            <p className={`mt-3 text-sm font-medium ${signOutMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
              {signOutMsg}
            </p>
          )}
        </div>

        {/* Note about passkeys */}
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs">
          <ShieldOff size={14} className="shrink-0 mt-0.5" />
          <span><strong>Passkeys:</strong> Google Admin API does not expose passkey status. To check or manage passkeys, go to Google Admin Console → Directory → Users → Security.</span>
        </div>

        {/* Login history */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Recent Login Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 10 login events from Google Workspace</p>
          </div>

          {histLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={22} className="animate-spin text-[#1A7DC4]" />
            </div>
          ) : histError ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-red-600 font-medium">{histError}</p>
              <p className="text-xs text-slate-400 mt-1">Make sure the Reports API scope is authorized in Google Admin Console (domain-wide delegation).</p>
            </div>
          ) : history.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No login events found for this user.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-medium">Time</th>
                  <th className="text-left px-5 py-3 font-medium">IP Address</th>
                  <th className="text-left px-5 py-3 font-medium">Device / Type</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((e, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${e.is_suspicious ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">{fmtDate(e.timestamp)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-700">{e.ip_address || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                        <DeviceIcon type={e.login_type} />
                        <span className="capitalize">{e.login_type?.replace(/_/g, ' ') || 'Web browser'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {e.is_suspicious ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertTriangle size={12} /> Suspicious
                        </span>
                      ) : e.event_name === 'login_failure' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <XCircle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // User list view
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Google Login History</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Loading…' : `${filtered.length} users — click any to see their Google login activity`}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search by name, email or domain…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1A7DC4]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">User</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Domain</th>
                <th className="text-left px-5 py-3 font-medium">Plan</th>
                <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Last Login</th>
                <th className="text-left px-5 py-3 font-medium">2SV</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No users found.</td></tr>
              )}
              {filtered.map(u => (
                <tr key={u.id} onClick={() => openUser(u)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
                        {u.first_name?.[0]}{u.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-[#1A7DC4]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">{u.domain_name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[u.plan_slug] ?? 'bg-slate-100 text-slate-600'}`}>
                      {u.plan_slug}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs hidden md:table-cell">
                    {u.last_login_at ? fmtDate(u.last_login_at) : <span className="text-red-500">Never</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${u.two_sv_enabled ? 'text-green-600' : 'text-red-500'}`}>
                      {u.two_sv_enabled ? '✓ On' : '✗ Off'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    <ChevronRight size={16} />
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
