import { useState, useEffect } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface SharedDrive {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  sizeMb: number;
  membersCount: number;
}

interface DriveMember {
  email: string;
  role: string;
}

const roleBadgeStyles: Record<string, string> = {
  organizer:        'bg-purple-50 text-purple-700',
  fileOrganizer:    'bg-blue-50 text-blue-700',
  writer:           'bg-amber-50 text-amber-700',
  commenter:        'bg-sky-50 text-sky-700',
  reader:           'bg-slate-100 text-slate-600',
};

function fmtSize(mb: number) {
  if (!mb) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function SharedDrivesPage() {
  const [drives, setDrives] = useState<SharedDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDrive, setSelectedDrive] = useState<SharedDrive | null>(null);
  const [members, setMembers] = useState<DriveMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    api.get<{ data: SharedDrive[] }>('/shared-drives')
      .then(r => setDrives(r.data ?? []))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load shared drives'))
      .finally(() => setLoading(false));
  }, []);

  function openDrive(drive: SharedDrive) {
    setSelectedDrive(drive);
    setMembers([]);
    setMembersLoading(true);
    api.get<{ data: DriveMember[] }>(`/shared-drives/${drive.id}/members`)
      .then(r => setMembers(r.data ?? []))
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Shared Drives</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Loading…' : error ? 'Error loading drives' : `${drives.length} shared drives · click a row to see members`}
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#1A7DC4]" /></div>
          ) : drives.length === 0 && !error ? (
            <div className="py-16 text-center text-slate-400 text-sm">No shared drives found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Sr.No', 'Name', 'Created By', 'Created Date', 'Size', 'Members'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {drives.map((drive, idx) => (
                  <tr key={drive.id} onClick={() => openDrive(drive)}
                    className="hover:bg-[#F0F7FF] cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-800">{drive.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{drive.createdBy || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {drive.createdAt ? new Date(drive.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{fmtSize(drive.sizeMb)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users size={13} className="text-slate-400" />
                        <span className="font-medium">{drive.membersCount}</span>
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

function MembersDrawer({ drive, members, loading, onClose }: { drive: SharedDrive; members: DriveMember[]; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="px-6 py-5 text-white flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}>
          <div>
            <h2 className="text-base font-semibold">{drive.name}</h2>
            <p className="text-sm text-blue-100 mt-0.5">{drive.membersCount} members · {fmtSize(drive.sizeMb)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors mt-0.5">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs text-slate-500">
              Created by <span className="font-medium text-slate-700">{drive.createdBy || '—'}</span>
              {drive.createdAt && ` on ${new Date(drive.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
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
