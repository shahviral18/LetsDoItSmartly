import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Monitor, Smartphone, Tablet, LogOut } from 'lucide-react';
import {
  mockUsers,
  mockEmailAliases,
  mockGroups,
  mockAccountEvents,
  mockDevices,
} from '../../mock/data';

const planColors: Record<string, string> = {
  basic:      'bg-slate-100 text-slate-600',
  pro:        'bg-blue-50 text-blue-700',
  enterprise: 'bg-indigo-50 text-indigo-700',
  premium:    'bg-cyan-50 text-cyan-700',
};

const statusStyles: Record<string, string> = {
  active:    'bg-green-50 text-green-700',
  suspended: 'bg-red-50 text-red-600',
  pending:   'bg-amber-50 text-amber-700',
};

const eventIcons: Record<string, string> = {
  created:        '✦',
  suspended:      '⊘',
  reactivated:    '✔',
  plan_changed:   '↑',
  password_reset: '🔑',
  login_failed:   '✗',
  '2sv_enabled':  '🛡',
  '2sv_disabled': '⚠',
};

const eventColors: Record<string, string> = {
  created:        'text-green-600 bg-green-50',
  suspended:      'text-red-600 bg-red-50',
  reactivated:    'text-green-600 bg-green-50',
  plan_changed:   'text-blue-600 bg-blue-50',
  password_reset: 'text-amber-600 bg-amber-50',
  login_failed:   'text-red-600 bg-red-50',
  '2sv_enabled':  'text-green-600 bg-green-50',
  '2sv_disabled': 'text-red-600 bg-red-50',
};

const groupRoleColors: Record<string, string> = {
  owner:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  member:  'bg-slate-100 text-slate-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DeviceIcon({ type }: { type: string }) {
  if (type === 'mobile') return <Smartphone size={16} className="text-slate-400" />;
  if (type === 'tablet') return <Tablet size={16} className="text-slate-400" />;
  return <Monitor size={16} className="text-slate-400" />;
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const user = mockUsers.find(u => u.id === userId);

  const [loggedOutDevices, setLoggedOutDevices] = useState<Set<string>>(new Set());
  const [allLoggedOut, setAllLoggedOut] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">User not found.</p>
        <Link to="/app/users" className="text-[#1A7DC4] text-sm mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const aliases = mockEmailAliases.filter(a => a.userId === userId);
  const groups = mockGroups.filter(g => g.userId === userId);
  const events = mockAccountEvents.filter(e => e.userId === userId).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const devices = mockDevices.filter(d => d.userId === userId);

  function logoutDevice(deviceId: string) {
    setLoggedOutDevices(prev => new Set([...prev, deviceId]));
  }

  function logoutAll() {
    setAllLoggedOut(true);
    setLoggedOutDevices(new Set(devices.map(d => d.id)));
  }

  const initials = `${user.firstName[0]}${user.lastName[0]}`;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back + header */}
      <div>
        <Link to="/app/users" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#1A7DC4] transition-colors mb-4">
          <ArrowLeft size={14} /> Back to Users
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-800">{user.firstName} {user.lastName}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[user.status]}`}>
                {user.status}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[user.plan]}`}>
                {user.plan}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{user.email} · {user.domain}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Profile</h2>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Domain" value={user.domain} />
            <InfoRow label="Plan" value={user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} />
            <InfoRow label="Created" value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <InfoRow label="Last Login" value={user.lastLogin ? formatDate(user.lastLogin) : '—'} />
            <InfoRow label="2SV" value={user.twoSVEnabled ? 'Enabled ✓' : 'Disabled ✗'} valueColor={user.twoSVEnabled ? 'text-green-600' : 'text-red-500'} />
            <InfoRow label="Storage" value={`${user.storageUsed} / ${user.storageTotal}`} />
          </div>

          {/* Email Aliases */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Email Aliases</h2>
            {aliases.length === 0 ? (
              <p className="text-xs text-slate-400">No aliases</p>
            ) : (
              <ul className="space-y-2">
                {aliases.map(a => (
                  <li key={a.id} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#29ABE2] shrink-0" />
                    {a.alias}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Group Memberships */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Group Memberships</h2>
            {groups.length === 0 ? (
              <p className="text-xs text-slate-400">No groups</p>
            ) : (
              <ul className="space-y-2.5">
                {groups.map(g => (
                  <li key={g.id} className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{g.groupName}</div>
                      <div className="text-xs text-slate-400">{g.groupEmail}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${groupRoleColors[g.role]}`}>
                      {g.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Account Status Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Account Timeline</h2>
            {events.length === 0 ? (
              <p className="text-xs text-slate-400">No events</p>
            ) : (
              <div className="relative pl-8">
                <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-100" />
                <ul className="space-y-4">
                  {events.map(ev => (
                    <li key={ev.id} className="relative">
                      <div className={`absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${eventColors[ev.type]}`}>
                        {eventIcons[ev.type] ?? '·'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{ev.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(ev.timestamp)}
                          {ev.actor && <span className="ml-1">· by <span className="text-slate-600">{ev.actor}</span></span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Logged-in Devices */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Logged-in Devices</h2>
              {devices.length > 1 && !allLoggedOut && (
                <button
                  onClick={logoutAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <LogOut size={12} /> Sign out all
                </button>
              )}
            </div>
            {devices.length === 0 ? (
              <p className="text-xs text-slate-400">No active devices</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {devices.map(d => {
                  const isOut = loggedOutDevices.has(d.id);
                  return (
                    <li key={d.id} className={`py-3 flex items-center gap-3 ${isOut ? 'opacity-40' : ''}`}>
                      <DeviceIcon type={d.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{d.name}</span>
                          {d.isCurrent && !isOut && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">Current</span>
                          )}
                          {isOut && <span className="text-xs text-slate-400">(Signed out)</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {d.os} · {d.browser} · {d.location} · {d.ip}
                        </p>
                        <p className="text-xs text-slate-400">Last active: {formatDate(d.lastActive)}</p>
                      </div>
                      {!isOut && !d.isCurrent && (
                        <button
                          onClick={() => logoutDevice(d.id)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={11} /> Sign out
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor = 'text-slate-800' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${valueColor}`}>{value}</span>
    </div>
  );
}

export default UserDetailPage;
