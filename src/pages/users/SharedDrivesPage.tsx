import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { mockSharedDrives, mockDriveMembers } from '../../mock/data';
import type { SharedDrive } from '../../types';

const roleBadgeStyles: Record<string, string> = {
  manager:          'bg-purple-50 text-purple-700',
  'content manager': 'bg-blue-50 text-blue-700',
  contributor:      'bg-amber-50 text-amber-700',
  viewer:           'bg-slate-100 text-slate-600',
};

export function SharedDrivesPage() {
  const [selectedDrive, setSelectedDrive] = useState<SharedDrive | null>(null);

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Shared Drives</h1>
        <p className="text-sm text-slate-500 mt-0.5">{mockSharedDrives.length} shared drives · click a row to see members</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
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
              {mockSharedDrives.map((drive, idx) => (
                <tr
                  key={drive.id}
                  onClick={() => setSelectedDrive(drive)}
                  className="hover:bg-[#F0F7FF] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <span className="font-medium text-slate-800">{drive.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{drive.createdBy}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(drive.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{drive.size}</td>
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
        </div>
      </div>

      {/* Members Drawer */}
      {selectedDrive && (
        <MembersDrawer drive={selectedDrive} onClose={() => setSelectedDrive(null)} />
      )}
    </div>
  );
}

function MembersDrawer({ drive, onClose }: { drive: SharedDrive; onClose: () => void }) {
  const members = mockDriveMembers[drive.id] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div
          className="px-6 py-5 text-white flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          <div>
            <h2 className="text-base font-semibold">{drive.name}</h2>
            <p className="text-sm text-blue-100 mt-0.5">{members.length} members · {drive.size}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors mt-0.5">
            <X size={15} />
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-xs text-slate-500">Created by <span className="font-medium text-slate-700">{drive.createdBy}</span> on {new Date(drive.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>

          {members.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No members found</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {members.map((m, i) => (
                <li key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0D5A96,#1A7DC4)' }}
                    >
                      {m.email[0].toUpperCase()}
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
