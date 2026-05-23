import { useState } from 'react';
import { CheckCircle2, Tag, AlertCircle } from 'lucide-react';
import { mockPlans, mockBillingEntities, mockCoupons } from '../../mock/data';
import { Card } from '../../components/ui/Card';
import type { Plan } from '../../types';

const PLAN_FEATURES: Record<Plan, string[]> = {
  basic: ['15 GB Storage', 'Google Workspace Core', 'Email & Calendar', 'Basic Support'],
  pro: ['30 GB Storage', 'All Basic features', 'Meet & Chat Pro', 'Priority Support'],
  enterprise: ['50 GB Storage', 'All Pro features', 'Advanced Admin', 'Dedicated Support'],
  premium: ['100 GB Storage', 'All Enterprise features', 'Vault & DLP', 'SLA 99.9%'],
};

export function BuyLicensesPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('basic');
  const [qty, setQty] = useState(5);
  const [selectedBE, setSelectedBE] = useState(mockBillingEntities[0].id);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discount: number; type: 'percent' | 'flat'; label: string } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [success, setSuccess] = useState(false);

  const plan = mockPlans[selectedPlan];
  const today = new Date('2026-05-24');
  const yearEnd = new Date('2027-01-15');
  const totalDays = 365;
  const daysRemaining = Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const perDayRate = plan.pricePerYear / totalDays;
  const proRataPerLicense = Math.round(perDayRate * daysRemaining);
  const subtotal = proRataPerLicense * qty;

  let discount = 0;
  if (appliedCoupon) {
    discount = appliedCoupon.type === 'percent'
      ? Math.round(subtotal * appliedCoupon.discount / 100)
      : appliedCoupon.discount;
  }
  const gst = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + gst;

  function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    const found = mockCoupons[code];
    if (!found) {
      setCouponError('Invalid coupon code');
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(found);
      setCouponError('');
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Order Placed!</h2>
        <p className="text-sm text-slate-500 mb-6">
          {qty} × {plan.name} license{qty > 1 ? 's' : ''} added to your account.
        </p>
        <button
          onClick={() => { setSuccess(false); setQty(5); setAppliedCoupon(null); setCouponCode(''); }}
          className="px-4 py-2 rounded-xl bg-[#1A7DC4] text-white text-sm hover:bg-[#0D5A96] transition-colors"
        >
          Buy More
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Buy Licenses</h1>
        <p className="text-sm text-slate-500 mt-0.5">Add licenses to your billing account — billed pro-rata for the remaining term.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-3 space-y-5">

          {/* Billing Entity selector */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Billing Account</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mockBillingEntities.map(be => (
                <button
                  key={be.id}
                  onClick={() => setSelectedBE(be.id)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedBE === be.id
                      ? 'border-[#1A7DC4] bg-blue-50 text-[#0D5A96] font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium">{be.name}</p>
                  <p className="text-xs opacity-60 mt-0.5">{be.gst}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Plan selector */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Select Plan</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(mockPlans) as Plan[]).map(p => {
                const planInfo = mockPlans[p];
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPlan(p)}
                    className={`relative text-left px-4 py-4 rounded-xl border-2 transition-all ${
                      selectedPlan === p
                        ? 'border-[#1A7DC4] bg-blue-50'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    {selectedPlan === p && (
                      <CheckCircle2 size={15} className="absolute top-3 right-3 text-[#1A7DC4]" />
                    )}
                    <div
                      className="w-2 h-2 rounded-full mb-2"
                      style={{ background: planInfo.color }}
                    />
                    <p className="text-sm font-semibold text-slate-800">{planInfo.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ₹{(planInfo.pricePerYear / 12).toLocaleString('en-IN')}/mo per user
                    </p>
                    <ul className="mt-2 space-y-1">
                      {PLAN_FEATURES[p].slice(0, 2).map(f => (
                        <li key={f} className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quantity */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Number of Licenses</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold transition-colors"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={500}
                value={qty}
                onChange={e => setQty(Math.max(1, Math.min(500, Number(e.target.value))))}
                className="w-20 text-center py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
              />
              <button
                onClick={() => setQty(q => Math.min(500, q + 1))}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold transition-colors"
              >
                +
              </button>
              <span className="text-sm text-slate-500">licenses</span>
            </div>
          </Card>

          {/* Coupon */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              <Tag size={14} className="inline mr-1.5 -mt-0.5" />
              Coupon Code
            </label>
            {appliedCoupon ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium">
                  <CheckCircle2 size={14} className="inline mr-1.5 -mt-0.5" />
                  {couponCode.toUpperCase()} — {appliedCoupon.label}
                </div>
                <button
                  onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code (try SAVE10)"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
                />
                <button
                  onClick={applyCoupon}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
            {couponError && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {couponError}
              </p>
            )}
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <Card className="p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Plan</span>
                <span className="font-medium text-slate-800">{plan.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Quantity</span>
                <span className="font-medium text-slate-800">{qty} license{qty > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-700 text-sm mb-2">Pro-rata Calculation</p>
              <div className="flex justify-between">
                <span>Days remaining in term</span>
                <span className="font-medium tabular-nums">{daysRemaining} days</span>
              </div>
              <div className="flex justify-between">
                <span>Per-day rate (per license)</span>
                <span className="font-medium tabular-nums">₹{perDayRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pro-rata per license</span>
                <span className="font-medium tabular-nums">₹{proRataPerLicense.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({appliedCoupon.label})</span>
                  <span className="tabular-nums">−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST (18%)</span>
                <span className="tabular-nums">₹{gst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-200 pt-2 mt-2">
                <span>Total Payable</span>
                <span className="tabular-nums">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccess(true)}
              className="mt-5 w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
            >
              Proceed to Checkout
            </button>

            <p className="mt-3 text-xs text-center text-slate-400">
              Invoice will be generated after payment
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default BuyLicensesPage;
