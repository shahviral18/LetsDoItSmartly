import { useState } from 'react';
import { Bell, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockBillingEntities } from '../../mock/data';

const allDomains = mockBillingEntities.flatMap(be => be.domains);

export function TopBar() {
  const { auth, currentDomainId, setCurrentDomainId } = useAuth();
  if (auth.status !== 'authenticated') return null;

  const { user } = auth;
  const isDomainOwner = user.role === 'domain_owner';
  const currentDomain = allDomains.find(d => d.id === currentDomainId);

  const [domainOpen, setDomainOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const initials = user.name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
      {/* Left — page title placeholder (pages can override via context later) */}
      <div />

      <div className="flex items-center gap-3">
        {/* Domain switcher — domain_owner only */}
        {isDomainOwner && (
          <div className="relative">
            <button
              onClick={() => setDomainOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Globe size={14} style={{ color: '#1A7DC4' }} />
              <span>{currentDomain?.name ?? 'Select domain'}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {domainOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDomainOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 overflow-hidden">
                  {allDomains.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setCurrentDomainId(d.id); setDomainOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        d.id === currentDomainId
                          ? 'font-semibold text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      style={d.id === currentDomainId ? { background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' } : {}}
                    >
                      <div>{d.name}</div>
                      <div className={`text-xs ${d.id === currentDomainId ? 'text-blue-100' : 'text-slate-400'}`}>
                        {d.userCount} users
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
            style={{ background: '#1A7DC4' }}
          />
        </button>

        {/* Avatar menu */}
        <div className="relative">
          <button
            onClick={() => setAvatarOpen(v => !v)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-slate-800 leading-tight">{user.name}</div>
              <div className="text-xs text-slate-400 leading-tight capitalize">{user.role.replace('_', ' ')}</div>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {avatarOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAvatarOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  Profile settings
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
