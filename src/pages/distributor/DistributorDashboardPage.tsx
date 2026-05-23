import { useState } from 'react';
import { Users, TrendingUp, Wallet, Clock, CheckCircle2, ChevronRight, Send } from 'lucide-react';
import { mockDistributorClients, mockCommissions, mockPlans } from '../../mock/data';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const statusVariant: Record<string, 'success' | 'warning' | 'info'> = {
  paid: 'success',
  pending: 'warning',
  processing: 'info',
};

export function DistributorDashboardPage() {
  const [payoutRequested, setPayoutRequested] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const totalAnnualValue = mockDistributorClients.reduce((s, c) => s + c.annualValue, 0);
  const totalClients = mockDistributorClients.length;
  const totalLicenses = mockDistributorClients.reduce((s, c) => s + c.totalLicenses, 0);
  const pendingCommission = mockCommissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commissionEarned, 0);
  const totalEarned = mockCommissions.reduce((s, c) => s + c.commissionEarned, 0);

  function submitPayout() {
    setPayoutSuccess(true);
    setPayoutRequested(false);
    setPayoutAmount('');
    setPayoutNote('');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Distributor Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Your client portfolio, commissions, and payouts.</p>
      </div>

      {payoutSuccess && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl mb-5">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">Payout request submitted successfully. We'll process it within 3–5 business days.</p>
          <button onClick={() => setPayoutSuccess(false)} className="ml-auto text-emerald-600 text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Clients', value: totalClients, icon: Users, color: '#1A7DC4' },
          { label: 'Total Licenses', value: totalLicenses, icon: TrendingUp, color: '#29ABE2' },
          { label: 'Annual Portfolio Value', value: `₹${totalAnnualValue.toLocaleString('en-IN')}`, icon: Wallet, color: '#0D5A96' },
          { label: 'Pending Commission', value: `₹${pendingCommission.toLocaleString('en-IN')}`, icon: Clock, color: '#f59e0b' },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${stat.color}18` }}
            >
              <stat.icon size={18} style={{ color: stat.color }} />
            </div>
            <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients table */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">My Clients</h2>
              <span className="text-xs text-slate-400">{totalClients} accounts</span>
            </div>
            <div className="divide-y divide-slate-50">
              {mockDistributorClients.map(client => {
                const today = new Date('2026-05-24');
                const renewal = new Date(client.renewalDate);
                const days = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const plans = Object.entries(client.activePlans)
                  .filter(([, qty]) => (qty ?? 0) > 0)
                  .map(([plan, qty]) => `${qty} × ${mockPlans[plan as keyof typeof mockPlans]?.name ?? plan}`)
                  .join(', ');

                return (
                  <div key={client.id} className="px-5 py-4 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                          {days <= 30 && (
                            <Badge variant="warning">Renews in {days}d</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{client.contactEmail}</p>
                        <p className="text-xs text-slate-400 mt-1">{plans}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold text-slate-800 tabular-nums">
                          ₹{client.annualValue.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{client.commissionRate}% comm.</p>
                        <button className="mt-1.5 flex items-center gap-0.5 text-xs text-[#1A7DC4] hover:underline ml-auto">
                          Details <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Commission & Payout */}
        <div className="space-y-5">
          {/* Commission history */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Commission Earnings</h2>
              <p className="text-xs text-slate-400 mt-0.5">Total earned: ₹{totalEarned.toLocaleString('en-IN')}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {mockCommissions.map(c => (
                <div key={c.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-700">{c.period}</p>
                    <Badge variant={statusVariant[c.status]}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Invoice: ₹{c.invoiceAmount.toLocaleString('en-IN')} × {c.commissionRate}%</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      ₹{c.commissionEarned.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {c.paidDate && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paid: {new Date(c.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Payout request */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Request Payout</h2>
            <p className="text-xs text-slate-400 mb-4">
              Available balance: <span className="font-semibold text-amber-600">₹{pendingCommission.toLocaleString('en-IN')}</span>
            </p>

            {!payoutRequested ? (
              <button
                onClick={() => setPayoutRequested(true)}
                className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-colors hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#1A7DC4,#29ABE2)' }}
              >
                Request Payout
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    placeholder={`Max ₹${pendingCommission.toLocaleString('en-IN')}`}
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Q2 commission payout"
                    value={payoutNote}
                    onChange={e => setPayoutNote(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitPayout}
                    disabled={!payoutAmount || Number(payoutAmount) <= 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ background: '#1A7DC4' }}
                  >
                    <Send size={13} />
                    Submit
                  </button>
                  <button
                    onClick={() => setPayoutRequested(false)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DistributorDashboardPage;
