import { useState } from 'react';
import { Pencil, Check, X, Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { mockPlans, mockCouponList } from '../../mock/data';
import type { Coupon } from '../../types';
import { fmtINR } from '../../lib/export';

type PlanKey = 'basic' | 'pro' | 'enterprise' | 'premium';

interface PlanRow {
  plan: PlanKey;
  name: string;
  pricePerYear: number;
  color: string;
}

const initialPlans: PlanRow[] = (Object.entries(mockPlans) as [PlanKey, typeof mockPlans.basic][]).map(([plan, v]) => ({
  plan,
  name: v.name,
  pricePerYear: v.pricePerYear,
  color: v.color,
}));

export default function SuperAdminPanel() {
  const [plans, setPlans] = useState<PlanRow[]>(initialPlans);
  const [editingPlan, setEditingPlan] = useState<PlanKey | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const [referralEnabled, setReferralEnabled] = useState(true);

  const [coupons, setCoupons] = useState<Coupon[]>(mockCouponList);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount: '', type: 'percent' as 'percent' | 'flat', label: '' });
  const [addingCoupon, setAddingCoupon] = useState(false);

  function startEdit(row: PlanRow) {
    setEditingPlan(row.plan);
    setEditPrice(String(row.pricePerYear));
  }

  function saveEdit(plan: PlanKey) {
    setPlans(ps => ps.map(p => p.plan === plan ? { ...p, pricePerYear: Number(editPrice) } : p));
    setEditingPlan(null);
  }

  function toggleCoupon(code: string) {
    setCoupons(cs => cs.map(c => c.code === code ? { ...c, active: !c.active } : c));
  }

  function deleteCoupon(code: string) {
    setCoupons(cs => cs.filter(c => c.code !== code));
  }

  function addCoupon() {
    if (!newCoupon.code || !newCoupon.discount) return;
    setCoupons(cs => [...cs, {
      code: newCoupon.code.toUpperCase(),
      discount: Number(newCoupon.discount),
      type: newCoupon.type,
      label: newCoupon.label || `${newCoupon.discount}${newCoupon.type === 'percent' ? '%' : '₹'} off`,
      active: true,
      usageCount: 0,
    }]);
    setNewCoupon({ code: '', discount: '', type: 'percent', label: '' });
    setAddingCoupon(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Super Admin Panel</h2>
        <p className="text-sm text-slate-500 mt-1">Manage plan pricing, referral system, and coupon codes.</p>
      </div>

      {/* Plan Pricing */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Plan Pricing Configuration</h3>
            <p className="text-xs text-slate-400 mt-0.5">Edit annual prices per license</p>
          </div>
        </div>
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
            {plans.map(row => (
              <tr key={row.plan} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="font-medium text-slate-800">{row.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {editingPlan === row.plan ? (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">₹</span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="w-28 border border-[#1A7DC4] rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-800">{fmtINR(row.pricePerYear)}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-500">
                  {fmtINR(Math.round(
                    (editingPlan === row.plan ? Number(editPrice) : row.pricePerYear) / 12
                  ))}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {editingPlan === row.plan ? (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => saveEdit(row.plan)} className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"><Check size={14} /></button>
                      <button onClick={() => setEditingPlan(null)} className="p-1.5 rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(row)} className="p-1.5 rounded-md text-slate-400 hover:text-[#1A7DC4] hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Referral System */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Referral System</h3>
            <p className="text-xs text-slate-400 mt-0.5">Enable or disable the referral programme globally</p>
          </div>
          <button
            onClick={() => setReferralEnabled(r => !r)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              referralEnabled
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {referralEnabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {referralEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${referralEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
          {referralEnabled
            ? 'Referral programme is active. Users can generate and share referral links for discount rewards.'
            : 'Referral programme is currently disabled. No referral links or rewards will be processed.'}
        </div>
      </section>

      {/* Coupon Management */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Coupon Code Management</h3>
            <p className="text-xs text-slate-400 mt-0.5">{coupons.length} coupons total</p>
          </div>
          <button
            onClick={() => setAddingCoupon(a => !a)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96] transition-colors"
          >
            <Plus size={14} /> Add Coupon
          </button>
        </div>

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
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4] bg-white">
                <option value="percent">% Percent</option>
                <option value="flat">₹ Flat</option>
              </select>
              <input placeholder="Label (optional)" value={newCoupon.label}
                onChange={e => setNewCoupon(n => ({ ...n, label: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40 focus:border-[#1A7DC4]" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addCoupon} className="px-4 py-1.5 rounded-lg bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96]">Save</button>
              <button onClick={() => setAddingCoupon(false)} className="px-4 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200">Cancel</button>
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
            {coupons.map(c => (
              <tr key={c.code} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-[#1A7DC4]" />
                    <span className="font-mono font-semibold text-slate-800">{c.code}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-700">
                  {c.type === 'percent' ? `${c.discount}%` : fmtINR(c.discount)} off
                </td>
                <td className="px-5 py-3.5 text-slate-500">{c.label}</td>
                <td className="px-5 py-3.5 text-slate-500">{c.usageCount} uses</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => toggleCoupon(c.code)} className="p-1.5 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={c.active ? 'Disable' : 'Enable'}>
                      {c.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => deleteCoupon(c.code)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
