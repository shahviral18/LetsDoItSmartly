import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Users, Loader2, RefreshCw, Clock, AlertCircle, Search, ChevronDown, Filter, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface SharedDrive {
  id: string;
  name: string;
  creator_email: string;
  domain: string;
  member_count: number;
  storage_mb: number;
  created_at: string;
  last_synced_at: string;
}

interface DriveMember {
  email: string;
  role: string;
}

const roleBadgeStyles: Record<string, string> = {
  organizer:      'bg-purple-50 text-purple-700',
  fileOrganizer:  'bg-blue-50 text-blue-700',
  writer:         'bg-amber-50 text-amber-700',
  commenter:      'bg-sky-50 text-sky-700',
  reader:         'bg-slate-100 text-slate-600',
};

const STAFF_ROLES = ['super_admin', 'admin', 'support_admin', 'account_manager', 'backoffice'];

function DomainMultiSelect({ domains, selected, onChange }: {
  domains: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = domains.filter(d => d.toLowerCase().includes(search.toLowerCase()));

  function toggle(d: string) {
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);
  }

  const label = selected.length === 0 ? 'All Domains'
    : selected.length === 1 ? selected[0]
    : `${selected.length} domains`;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-[#1A7DC4] transition-colors min-w-[160px]">
        <Filter size={13} className="text-slate-400 shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
        {selected.length > 0 && (
          <span className="shrink-0 w-4 h-4 rounded-full bg-[#1A7DC4] text-white text-[10px] flex items-center justify-center font-bold">
            {selected.length}
          </span>
        )}
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search domain…"
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-[#1A7DC4]" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {selected.length > 0 && (
              <button onClick={() => onChange([])}
                className="w-full text-left px-3 py-2 text-xs text-[#1A7DC4] font-medium hover:bg-blue-50 border-b border-slate-100">
                Clear all
              </button>
            )}
            {filtered.length === 0
              ? <p className="px-3 py-4 text-xs text-slate-400 text-center">No domains found</p>
              : filtered.map(d => (
                <label key={d} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(d)} onChange={() => toggle(d)}
                    className="accent-[#1A7DC4]" />
                  <span className="text-sm text-slate-700 truncate">{d}</span>
                </label>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

export function SharedDrivesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isStaff = STAFF_ROLES.includes(user?.role ?? '');

  const [drives, setDrives] = useState<SharedDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ total: number; done: number; errors: number; status: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters (staff only)
  const [nameSearch, setNameSearch] = useState('');
  const [creatorSearch, setCreatorSearch] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);

  const [selectedDrive, setSelectedDrive] = useState<SharedDrive | null>(null);
  const [members, setMembers] = useState<DriveMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  function loadDrives() {
    setLoading(true); setError('');
    api.get<{ data: SharedDrive[]; last_synced_at: string | null }>('/shared-drives')
      .then(r => { setDrives(r.data ?? []); setLastSyncedAt(r.last_synced_at ?? null); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load shared drives'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDrives(); }, []);

  const syncStartRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);


  async function triggerSync() {
    setSyncing(true); setSyncMsg(''); setSyncProgress(null);
    syncStartRef.current = Date.now();
    setElapsed(0);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (syncStartRef.current ?? Date.now())) / 1000));
    }, 1000);
    // Poll sync-status while the POST runs (POST is synchronous, may take 30-60s)
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.get<{ status: string; total: number; done: number; errors: number } | null>('/shared-drives/sync-status');
        if (status && status.status && status.status !== 'idle') {
          setSyncProgress({ status: status.status, total: status.total, done: status.done, errors: status.errors });
        }
      } catch { /* ignore */ }
    }, 2000);
    try {
      const stats = await api.post<{ synced: number; errors: number; duration_sec: number }>('/shared-drives/sync', {});
      stopPolling();
      setSyncing(false);
      setSyncMsg(`Sync complete — ${stats.synced} drives synced in ${Math.round(stats.duration_sec)}s.`);
      loadDrives();
    } catch (e) {
      stopPolling();
      setSyncing(false);
      setSyncMsg(e instanceof Error ? e.message : 'Sync failed');
    }
  }

  function openDrive(drive: SharedDrive) {
    setSelectedDrive(drive);
    setMembers([]); setMembersLoading(true);
    api.get<{ data: DriveMember[] }>(`/shared-drives/${drive.id}/members`)
      .then(r => setMembers(r.data ?? []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }

  // All unique domains for the multi-select
  const allDomains = useMemo(() =>
    [...new Set(drives.map(d => d.domain).filter(Boolean))].sort(),
    [drives]
  );

  // Apply filters (staff only)
  const filtered = useMemo(() => {
    return drives.filter(d => {
      if (nameSearch && !d.name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      if (creatorSearch && !d.creator_email.toLowerCase().includes(creatorSearch.toLowerCase())) return false;
      if (selectedDomains.length > 0 && !selectedDomains.includes(d.domain)) return false;
      return true;
    });
  }, [drives, nameSearch, creatorSearch, selectedDomains, isStaff]);

  const hasFilters = nameSearch || creatorSearch || selectedDomains.length > 0;

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const fmtStorage = (mb: number) => {
    if (!mb) return '—';
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(1)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const fmtDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Shared Drives</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading…' : error ? 'Error loading drives'
              : hasFilters
                ? `${filtered.length} of ${drives.length} drives`
                : `${drives.length} shared drives · click a row to see members`}
          </p>
        </div>
        {isSuperAdmin && (
          <button onClick={triggerSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A7DC4] hover:bg-[#0D5A96] text-white text-sm font-medium transition-colors disabled:opacity-60 shrink-0">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing
              ? syncProgress && syncProgress.total > 0
                ? `${Math.min(100, Math.round((syncProgress.done / syncProgress.total) * 100))}% · ${elapsed}s`
                : `${elapsed}s…`
              : 'Refresh Data'}
          </button>
        )}
      </div>

      {/* Staleness notice */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <Clock size={14} className="shrink-0" />
        <span>
          Data is <strong>24–48 hours old</strong>. Shared drives created recently may not appear yet.
          {fmtDateTime(lastSyncedAt) ? <> Last synced: <strong>{fmtDateTime(lastSyncedAt)}</strong>.</> : <> No sync has run yet — data will appear after the first sync.</>}
        </span>
      </div>

      {syncing && (
        <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>{syncProgress && syncProgress.total > 0 ? 'Syncing drives…' : 'Connecting to Google…'}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-blue-600">
              {syncProgress && syncProgress.errors > 0 && (
                <span className="text-amber-600 font-medium">{syncProgress.errors} errors</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {elapsed}s elapsed
              </span>
            </div>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
            {syncProgress && syncProgress.total > 0 ? (
              <div className="h-full bg-[#1A7DC4] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((syncProgress.done / syncProgress.total) * 100))}%` }} />
            ) : (
              <div className="h-full bg-[#1A7DC4] rounded-full animate-pulse w-1/4" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-blue-600">
            {syncProgress && syncProgress.total > 0 ? (
              <>
                <span>{syncProgress.done} of {syncProgress.total} drives processed</span>
                <span className="font-semibold">{Math.min(100, Math.round((syncProgress.done / syncProgress.total) * 100))}%</span>
              </>
            ) : (
              <span>Fetching drive list from Google — this may take 10–30 seconds…</span>
            )}
          </div>
        </div>
      )}

      {syncMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${syncMsg.startsWith('Sync complete') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {syncMsg.startsWith('Sync complete')
            ? <CheckCircle2 size={14} className="shrink-0" />
            : <AlertCircle size={14} className="shrink-0" />}
          {syncMsg}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Filters */}
      {!loading && drives.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={nameSearch} onChange={e => setNameSearch(e.target.value)}
              placeholder="Search by drive name…"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#1A7DC4]" />
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={creatorSearch} onChange={e => setCreatorSearch(e.target.value)}
              placeholder="Search by creator email…"
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-[#1A7DC4]" />
          </div>
          <DomainMultiSelect domains={allDomains} selected={selectedDomains} onChange={setSelectedDomains} />
          {hasFilters && (
            <button onClick={() => { setNameSearch(''); setCreatorSearch(''); setSelectedDomains([]); }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors">
              <X size={13} /> Clear
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1A7DC4]" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {hasFilters ? 'No drives match your filters.' : `No shared drives found.${isSuperAdmin ? ' Click "Refresh Data" to sync from Google.' : ''}`}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Sr.No', 'Name', 'Creator', 'Domain', 'Created Date', 'Storage', 'Members'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((drive, idx) => (
                  <tr key={drive.id} onClick={() => openDrive(drive)}
                    className="hover:bg-[#F0F7FF] cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-800">{drive.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{drive.creator_email || '—'}</td>
                    <td className="px-4 py-3">
                      {drive.domain
                        ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{drive.domain}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(drive.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">{fmtStorage(drive.storage_mb)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users size={13} className="text-slate-400" />
                        <span className="font-medium">{drive.member_count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedDrive && (
        <MembersDrawer drive={selectedDrive} members={members} loading={membersLoading} onClose={() => setSelectedDrive(null)} />
      )}
    </div>
  );
}

function MembersDrawer({ drive, members, loading, onClose }: {
  drive: SharedDrive; members: DriveMember[]; loading: boolean; onClose: () => void;
}) {
  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const fmtStorage = (mb: number) => {
    if (!mb) return null;
    if (mb >= 1048576) return `${(mb / 1048576).toFixed(1)} TB`;
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="px-6 py-5 text-white flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
          <div>
            <h2 className="text-base font-semibold">{drive.name}</h2>
            <p className="text-sm text-blue-100 mt-0.5">{drive.member_count} members</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors mt-0.5">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100 space-y-0.5">
            <p className="text-xs text-slate-500">Creator: <span className="font-medium text-slate-700">{drive.creator_email || '—'}</span></p>
            {drive.domain && <p className="text-xs text-slate-500">Domain: <span className="font-medium text-blue-600">{drive.domain}</span></p>}
            {fmtDate(drive.created_at) && <p className="text-xs text-slate-500">Created: <span className="font-medium text-slate-700">{fmtDate(drive.created_at)}</span></p>}
            {fmtStorage(drive.storage_mb) && <p className="text-xs text-slate-500">Storage used: <span className="font-medium text-slate-700">{fmtStorage(drive.storage_mb)}</span></p>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-[#1A7DC4]" /></div>
          ) : members.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No members found</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {members.map((m, i) => (
                <li key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0D5A96,#1A7DC4)' }}>
                      {m.email[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-sm text-slate-700 truncate">{m.email}</span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadgeStyles[m.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default SharedDrivesPage;
