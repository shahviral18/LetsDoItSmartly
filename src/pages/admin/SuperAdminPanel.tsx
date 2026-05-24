import { useState, useEffect } from 'react';
import { Pencil, Check, X, Plus, Trash2, ToggleLeft, ToggleRight, Tag, Users, KeyRound, Loader2, Building2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { fmtINR } from '../../lib/export';

type Tab = 'owners' | 'plans' | 'coupons';

// ── Portal Owner types ────────────────────────────────────────────────────────
interface PortalUser {
  id: number;
  name: string;
  email: string;
  is_active: number;
  last_login_at?: string;
  billing_entity_id: number;
  billing_entity_name: string;
  domain_count: number;
}
interface BillingEntity { id: number; name: string; slug: string; }

// ── Plan types ────────────────────────────────────────────────────────────────
interface PlanRow { id: number; slug: string; name: string; price_per_year: number; ou_suffix: string; }

// ── Coupon types ──────────────────────────────────────────────────────────────
interface Coupon { id?: number; code: string; discount: number; type: 'percent' | 'flat'; label: string; active: boolean; usage_count?: number; }

function fmtDate(iso?: string) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SuperAdminPanel() {
  const [tab, setTab] = useState<Tab>('owners');

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'owners', label: 'Domain Owners', icon: Users },
    { id: 'plans',  label: 'Plan Pricing',  icon: Tag },
    { id: 'coupons',label: 'Coupons',        icon: Tag },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Super Admin Panel</h2>
        <p className="text-sm text-slate-500 mt-1">Manage domain owners, plan pricing, and coupon codes.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'owners'  && <DomainOwnersTab />}
      {tab === 'plans'   && <PlansTab />}
      {tab === 'coupons' && <CouponsTab />}
    </div>
  );
}

// ── Domain Owners Tab ─────────────────────────────────────────────────────────
function DomainOwnersTab() {
  const [owners, setOwners] = useState<PortalUser[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', billing_entity_id: '' });
  const [creating, setCreating] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<{ data: PortalUser[] }>('/portal-users'),
      api.get<{ data: BillingEntity[] }>('/billing-entities'),
    ]).then(([pu, be]) => {
      setOwners(pu.data ?? []);
      setEntities(be.data ?? []);
    }).catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.billing_entity_id) return;
    setCreating(true); setErr(''); setMsg('');
    try {
      const res = await api.post<{ id: number; email: string; password?: string; message: string }>('/portal-users', {
        name: form.name, email: form.email, billing_entity_id: Number(form.billing_entity_id),
      });
      if (res.password) {
        setMsg(`Created! Temporary password: ${res.password} — share this securely.`);
      } else {
        setMsg('Domain owner created.');
      }
      setForm({ name: '', email: '', billing_entity_id: '' });
      setShowCreate(false);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(owner: PortalUser) {
    try {
      await api.patch(`/portal-users/${owner.id}`, { is_active: owner.is_active ? 0 : 1 });
      setOwners(prev => prev.map(o => o.id === owner.id ? { ...o, is_active: o.is_active ? 0 : 1 } : o));
    } catch (e: any) { setErr(e.message); }
  }

  async function resetPassword(owner: PortalUser) {
    setResettingId(owner.id); setErr(''); setMsg('');
    try {
      const res = await api.post<{ new_password: string }>(`/portal-users/${owner.id}/reset-password`, {});
      setMsg(`Password reset for ${owner.email}. New password: ${res.new_password}`);
    } catch (e: any) { setErr(e.message); }
    finally { setResettingId(null); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{owners.length} domain owner accounts</p>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setShowCreate(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96] transition-colors">
            <Plus size={14} /> Add Domain Owner
          </button>
        </div>
      </div>

      {msg && <div className="px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-mono">{msg}</div>}
      {err && <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={create} className="bg-[#F0F7FF] border border-blue-100 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">New Domain Owner</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="John Doe" required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="owner@company.com" required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Billing Entity (Company)</label>
              <select value={form.billing_entity_id} onChange={e => setForm(f => ({ ...f, billing_entity_id: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4] bg-white">
                <option value="">— Select company —</option>
                {entities.map(be => <option key={be.id} value={be.id}>{be.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">A temporary password will be auto-generated and shown once.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96] disabled:opacity-60 flex items-center gap-2">
              {creating ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : 'Create Account'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Name', 'Email', 'Linked Company', 'Domains', 'Last Login', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center"><Loader2 size={20} className="animate-spin text-slate-300 mx-auto" /></td></tr>
            ) : owners.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No domain owners yet. Create one above.</td></tr>
            ) : owners.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{o.name}</td>
                <td className="px-5 py-3.5 text-slate-500">{o.email}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building2 size={13} className="text-slate-400" />
                    {o.billing_entity_name}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{o.domain_count} domain{o.domain_count !== 1 ? 's' : ''}</td>
                <td className="px-5 py-3.5 text-slate-400 text-xs">{fmtDate(o.last_login_at)}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {o.is_active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(o)} title={o.is_active ? 'Suspend' : 'Activate'}
                      className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${o.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {o.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    <button onClick={() => resetPassword(o)} title="Reset Password" disabled={resettingId === o.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50">
                      {resettingId === o.id ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────
function PlansTab() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<{ data: PlanRow[] }>('/plans')
      .then(r => setPlans(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(plan: PlanRow) {
    setSaving(true);
    try {
      await api.post(`/plans/${plan.id}`, { price_per_year: Number(editPrice) });
      setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, price_per_year: Number(editPrice) } : p));
      setMsg('Price updated.');
      setEditingId(null);
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Plan Pricing Configuration</h3>
        <p className="text-xs text-slate-400 mt-0.5">Annual price per license seat</p>
      </div>
      {msg && <div className="px-5 py-2 bg-green-50 text-green-700 text-sm">{msg}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-medium">Plan</th>
            <th className="text-left px-5 py-3 font-medium">Annual Price / License</th>
            <th className="text-left px-5 py-3 font-medium">Monthly Equiv.</th>
            <th className="px-5 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={4} className="px-5 py-10 text-center"><Loader2 size={18} className="animate-spin text-slate-300 mx-auto" /></td></tr>
          ) : plans.map(row => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3.5 font-medium text-slate-800 capitalize">{row.name}</td>
              <td className="px-5 py-3.5">
                {editingId === row.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">₹</span>
                    <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} autoFocus
                      className="w-28 border border-[#1A7DC4] rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40" />
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800">{fmtINR(row.price_per_year)}</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-slate-500">
                {fmtINR(Math.round((editingId === row.id ? Number(editPrice) : row.price_per_year) / 12))}
              </td>
              <td className="px-5 py-3.5 text-right">
                {editingId === row.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => save(row)} disabled={saving}
                      className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingId(row.id); setEditPrice(String(row.price_per_year)); }}
                    className="p-1.5 rounded-md text-slate-400 hover:text-[#1A7DC4] hover:bg-blue-50"><Pencil size={14} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ── Coupons Tab ───────────────────────────────────────────────────────────────
function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', type: 'percent' as 'percent' | 'flat', label: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get<{ data: Coupon[] }>('/admin/coupons')
      .then(r => setCoupons(r.data ?? []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  async function addCoupon() {
    if (!newCoupon.code || !newCoupon.discount) return;
    try {
      await api.post('/admin/coupons', {
        code: newCoupon.code.toUpperCase(), discount: Number(newCoupon.discount),
        type: newCoupon.type, label: newCoupon.label || `${newCoupon.discount}${newCoupon.type === 'percent' ? '%' : '₹'} off`,
      });
      const res = await api.get<{ data: Coupon[] }>('/admin/coupons');
      setCoupons(res.data ?? []);
      setNewCoupon({ code: '', discount: '', type: 'percent', label: '' });
      setAddingCoupon(false);
    } catch (e: any) { setMsg(e.message); }
  }

  async function toggleCoupon(c: Coupon) {
    try {
      await api.patch(`/admin/coupons/${c.id}`, { active: c.active ? 0 : 1 });
      setCoupons(cs => cs.map(x => x.id === c.id ? { ...x, active: !x.active } : x));
    } catch (e: any) { setMsg(e.message); }
  }

  async function deleteCoupon(c: Coupon) {
    try {
      await api.patch(`/admin/coupons/${c.id}`, { deleted: 1 });
      setCoupons(cs => cs.filter(x => x.id !== c.id));
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Coupon Code Management</h3>
          <p className="text-xs text-slate-400 mt-0.5">{coupons.length} coupons</p>
        </div>
        <button onClick={() => setAddingCoupon(a => !a)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96]">
          <Plus size={14} /> Add Coupon
        </button>
      </div>
      {msg && <div className="px-5 py-2 bg-amber-50 text-amber-700 text-sm">{msg}</div>}

      {addingCoupon && (
        <div className="px-5 py-4 bg-[#F0F7FF] border-b border-blue-100">
          <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">New Coupon</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input placeholder="Code (e.g. SAVE10)" value={newCoupon.code}
              onChange={e => setNewCoupon(n => ({ ...n, code: e.target.value.toUpperCase() }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
            <input placeholder="Discount amount" type="number" value={newCoupon.discount}
              onChange={e => setNewCoupon(n => ({ ...n, discount: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
            <select value={newCoupon.type} onChange={e => setNewCoupon(n => ({ ...n, type: e.target.value as 'percent' | 'flat' }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white focus:ring-2 focus:ring-[#29ABE2]/40">
              <option value="percent">% Percent</option>
              <option value="flat">₹ Flat</option>
            </select>
            <input placeholder="Label (optional)" value={newCoupon.label}
              onChange={e => setNewCoupon(n => ({ ...n, label: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={addCoupon} className="px-4 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96]">Save</button>
            <button onClick={() => setAddingCoupon(false)} className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-5 py-3 font-medium">Code</th>
            <th className="text-left px-5 py-3 font-medium">Discount</th>
            <th className="text-left px-5 py-3 font-medium">Label</th>
            <th className="text-left px-5 py-3 font-medium">Usage</th>
            <th className="text-left px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={6} className="px-5 py-10 text-center"><Loader2 size={18} className="animate-spin text-slate-300 mx-auto" /></td></tr>
          ) : coupons.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No coupons yet.</td></tr>
          ) : coupons.map(c => (
            <tr key={c.id ?? c.code} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2"><Tag size={13} className="text-[#1A7DC4]" />
                  <span className="font-mono font-semibold text-slate-800">{c.code}</span>
                </div>
              </td>
              <td className="px-5 py-3.5 font-medium text-slate-700">
                {c.type === 'percent' ? `${c.discount}%` : fmtINR(c.discount)} off
              </td>
              <td className="px-5 py-3.5 text-slate-500">{c.label}</td>
              <td className="px-5 py-3.5 text-slate-500">{c.usage_count ?? 0} uses</td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => toggleCoupon(c)} title={c.active ? 'Disable' : 'Enable'}
                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                    {c.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button onClick={() => deleteCoupon(c)} title="Delete"
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
