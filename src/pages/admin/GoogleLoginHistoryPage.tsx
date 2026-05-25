import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, ChevronRight, Monitor, Smartphone, Globe, AlertTriangle, CheckCircle2, XCircle, LogOut, ArrowLeft, ShieldOff, X } from 'lucide-react';
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
  login_type: string;
  challenge: string;
  challenge_result: string;
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
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<GUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GUser | null>(null);
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMsg, setSignOutMsg] = useState('');
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  useEffect(() => {
    api.get<{ data: GUser[] }>('/google/users')
      .then(r => setUsers(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (!emailParam || users.length === 0 || loading) return;
    const match = users.find(u => u.email.toLowerCase() === emailParam.toLowerCase());
    if (match) openUser(match);
  }, [searchParams, users]);

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
    setShowSignOutModal(false);
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
              onClick={() => setShowSignOutModal(true)}
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
            <p className="text-xs text-slate-400 mt-0.5">Last 10 login events from Google Workspace. IP addresses are not provided by Google Reports API.</p>
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
                  <th className="text-left px-5 py-3 font-medium">Login Method</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Detail</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((e, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${e.is_suspicious ? 'bg-red-50/40' : ''}`}>
                    <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">{fmtDate(e.timestamp)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                        <DeviceIcon type={e.login_type} />
                        <span className="capitalize">{e.login_type?.replace(/_/g, ' ') || 'Password'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {e.is_suspicious ? (
                        <div>
                          <span className="text-red-600 text-xs font-medium">
                            {e.challenge_result ? e.challenge_result.replace(/_/g, ' ') : 'Flagged by Google'}
                          </span>
                          <p className="text-slate-400 text-xs mt-0.5">Unusual activity detected</p>
                        </div>
                      ) : e.event_name === 'login_failure' ? (
                        <span className="text-amber-600 text-xs font-medium">Wrong password</span>
                      ) : e.event_name === 'logout' ? (
                        <span className="text-slate-400 text-xs">User signed out</span>
                      ) : e.challenge ? (
                        <span className="text-slate-500 text-xs capitalize">{e.challenge.replace(/_/g, ' ')}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
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
                      ) : e.event_name === 'logout' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <LogOut size={12} /> Logged out
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

        {/* Force Sign Out Confirmation Modal */}
        {showSignOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">Force Sign Out</h3>
                <button onClick={() => setShowSignOutModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X size={16} />
                </button>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm">
                <p className="font-medium text-slate-700">{selected.first_name} {selected.last_name}</p>
                <p className="text-xs text-red-600 mt-0.5">{selected.email}</p>
              </div>
              <p className="text-sm text-slate-600">
                This will immediately sign <strong>{selected.first_name}</strong> out of <strong>all Google sessions on every device</strong>. They will need to log in again.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSignOutModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={forceSignOut}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                  <LogOut size={14} /> Force Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
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
