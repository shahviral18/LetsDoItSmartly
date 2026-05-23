import { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { mockPlans, mockBillingEntities } from '../../mock/data';
import { Card } from '../../components/ui/Card';
import type { Plan } from '../../types';

const PLAN_ORDER: Plan[] = ['basic', 'pro', 'enterprise', 'premium'];

export function UpgradePlanPage() {
  const be = mockBillingEntities[0];
  // Determine current plan (most used plan in billing entity)
  const currentPlan: Plan = 'basic';
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pro');
  const [qty, setQty] = useState(10);
  const [confirmed, setConfirmed] = useState(false);

  const today = new Date('2026-05-24');
  const yearEnd = new Date('2027-01-15');
  const totalDays = 365;
  const daysRemaining = Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const currentPlanInfo = mockPlans[currentPlan];
  const newPlanInfo = mockPlans[selectedPlan];
  const rateDiff = newPlanInfo.pricePerYear - currentPlanInfo.pricePerYear;
  const perDayDiff = rateDiff / totalDays;
  const upgradeAmountPerLicense = Math.round(perDayDiff * daysRemaining);
  const subtotal = upgradeAmountPerLicense * qty;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  const isUpgrade = PLAN_ORDER.indexOf(selectedPlan) > PLAN_ORDER.indexOf(currentPlan);
  const isDowngrade = PLAN_ORDER.indexOf(selectedPlan) < PLAN_ORDER.indexOf(currentPlan);

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Plan Upgraded!</h2>
        <p className="text-sm text-slate-500 mb-6 text-center max-w-xs">
          {qty} licenses have been upgraded from <strong>{currentPlanInfo.name}</strong> to{' '}
          <strong>{newPlanInfo.name}</strong>.
        </p>
        <button
          onClick={() => setConfirmed(false)}
          className="px-4 py-2 rounded-xl bg-[#1A7DC4] text-white text-sm hover:bg-[#0D5A96] transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Upgrade Plan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upgrade existing licenses — pay only the pro-rata difference for remaining days.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">

          {/* Current plan */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Current Plan</p>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-3 h-3 rounded-full" style={{ background: currentPlanInfo.color }} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{currentPlanInfo.name}</p>
                <p className="text-xs text-slate-500">
                  ₹{currentPlanInfo.pricePerYear.toLocaleString('en-IN')}/year per license — {be.name}
                </p>
              </div>
            </div>
          </Card>

          {/* New plan selector */}
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-700 mb-3">Upgrade To</p>
            <div className="grid grid-cols-2 gap-3">
              {PLAN_ORDER.filter(p => p !== currentPlan).map(p => {
                const planInfo = mockPlans[p];
                const diff = planInfo.pricePerYear - currentPlanInfo.pricePerYear;
                const isDown = diff < 0;
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
                    <div className="w-2 h-2 rounded-full mb-2" style={{ background: planInfo.color }} />
                    <p className="text-sm font-semibold text-slate-800">{planInfo.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: isDown ? '#ef4444' : '#10b981' }}>
                      {isDown ? '−' : '+'}₹{Math.abs(diff / 12).toLocaleString('en-IN')}/mo/user
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Qty */}
          <Card className="p-5">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Licenses to Upgrade</label>
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
                value={qty}
                onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                className="w-20 text-center py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
              />
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-lg font-bold transition-colors"
              >
                +
              </button>
              <span className="text-sm text-slate-500">of {be.licensePool[currentPlan].allocated} allocated</span>
            </div>
          </Card>
        </div>

        {/* Right: Invoice Preview */}
        <div className="lg:col-span-2">
          <Card className="p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Invoice Preview</h2>

            <div className="flex items-center gap-2 mb-4">
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: currentPlanInfo.color }}
              >
                {currentPlanInfo.name}
              </div>
              <ArrowRight size={14} className="text-slate-400" />
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-white"
                style={{ background: newPlanInfo.color }}
              >
                {newPlanInfo.name}
              </div>
            </div>

            {isDowngrade && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                Downgrading will take effect at next renewal. No refund is issued mid-term.
              </div>
            )}

            {isUpgrade && (
              <div className="mt-1 p-3 bg-blue-50 rounded-xl text-xs text-slate-600 space-y-1.5 mb-4">
                <p className="font-semibold text-slate-700 text-sm mb-2">Pro-rata Difference</p>
                <div className="flex justify-between">
                  <span>Days remaining</span>
                  <span className="font-medium tabular-nums">{daysRemaining} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate difference/day</span>
                  <span className="font-medium tabular-nums">₹{perDayDiff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount per license</span>
                  <span className="font-medium tabular-nums">₹{upgradeAmountPerLicense.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {isUpgrade && (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>{qty} × ₹{upgradeAmountPerLicense.toLocaleString('en-IN')}</span>
                    <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
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
                  onClick={() => setConfirmed(true)}
                  className="mt-5 w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
                >
                  Confirm Upgrade & Pay
                </button>
              </>
            )}

            {isDowngrade && (
              <button
                onClick={() => setConfirmed(true)}
                className="mt-2 w-full py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Schedule Downgrade at Renewal
              </button>
            )}

            <p className="mt-3 text-xs text-center text-slate-400">
              Invoice will be generated immediately
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
