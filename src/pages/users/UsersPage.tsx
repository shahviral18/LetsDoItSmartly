import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { mockUsers } from '../../mock/data';
import type { PortalUser } from '../../types';
import { CreateUserModal } from './CreateUserModal';

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

function isStaleLogin(lastLogin?: string): boolean {
  if (!lastLogin) return false;
  const diff = Date.now() - new Date(lastLogin).getTime();
  return diff > 30 * 24 * 60 * 60 * 1000;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function UsersPage() {
  const [users, setUsers] = useState<PortalUser[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const allDomains = [...new Set(mockUsers.map(u => u.domain))];

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchDomain = filterDomain === 'all' || u.domain === filterDomain;
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchDomain && matchPlan && matchStatus;
  });

  function handleCreate(newUser: PortalUser) {
    setUsers(prev => [...prev, newUser]);
    setShowCreateModal(false);
  }

  function handleToggleSuspend(userId: string) {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u
    ));
  }

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} of {users.length} users</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
        >
          <Plus size={15} />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm text-slate-700 placeholder-slate-400 outline-none w-full bg-transparent"
          />
        </div>
        <FilterSelect label="Domain" value={filterDomain} onChange={setFilterDomain}
          options={[{ value: 'all', label: 'All Domains' }, ...allDomains.map(d => ({ value: d, label: d }))]} />
        <FilterSelect label="Plan" value={filterPlan} onChange={setFilterPlan}
          options={[{ value: 'all', label: 'All Plans' }, ...['basic', 'pro', 'enterprise', 'premium'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))]} />
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}
          options={[{ value: 'all', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'pending', label: 'Pending' }]} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Name', 'Email', 'Domain', 'Plan', 'Status', 'Last Login', '2SV', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No users match your filters
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const stale = isStaleLogin(u.lastLogin);
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
                          <Link
                            to={`/app/users/${u.id}`}
                            className="font-medium text-slate-800 hover:text-[#1A7DC4] transition-colors"
                          >
                            {u.firstName} {u.lastName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email}</td>
                      <td className="px-4 py-3 text-slate-600">{u.domain}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${planColors[u.plan]}`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[u.status]}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={stale ? 'text-red-500 font-medium' : 'text-slate-500'}>
                          {formatDate(u.lastLogin)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.twoSVEnabled ? (
                          <span className="text-green-600 font-semibold text-xs">ON</span>
                        ) : (
                          <span className="text-red-500 font-semibold text-xs">OFF</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/app/users/${u.id}`}
                            className="text-xs font-medium text-[#1A7DC4] hover:underline"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleToggleSuspend(u.id)}
                            className={`text-xs font-medium ${u.status === 'suspended' ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                          >
                            {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} existingUsers={users} />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/20 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

export default UsersPage;
