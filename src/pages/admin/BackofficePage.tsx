import { mockBillingEntities, mockInvoices, mockPlans } from '../../mock/data';
import { DollarSign, Users, Building2, TrendingUp, Package } from 'lucide-react';
import StatCard from '../../components/shared/StatCard';
import ExportBar from '../../components/shared/ExportBar';
import { exportCSV, exportPDF, fmtINR } from '../../lib/export';

type PlanKey = 'basic' | 'pro' | 'enterprise' | 'premium';
const planOrder: PlanKey[] = ['basic', 'pro', 'enterprise', 'premium'];

export default function BackofficePage() {
  const totalRevenue = mockInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pendingRevenue = mockInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalLicenses = mockBillingEntities.reduce((s, be) =>
    s + planOrder.reduce((ps, p) => ps + be.licensePool[p].allocated, 0), 0);
  const usedLicenses = mockBillingEntities.reduce((s, be) =>
    s + planOrder.reduce((ps, p) => ps + be.licensePool[p].used, 0), 0);

  const subRows = mockBillingEntities.map(be => ({
    name: be.name,
    gst: be.gst ?? '—',
    domains: be.domains.length,
    licenses: planOrder.reduce((s, p) => s + be.licensePool[p].allocated, 0),
    used: planOrder.reduce((s, p) => s + be.licensePool[p].used, 0),
    revenue: mockInvoices.filter(i => i.billingEntity === be.name && i.status === 'paid').reduce((s, i) => s + i.amount, 0),
  }));

  const exportHeaders = ['Billing Entity', 'GST', 'Domains', 'Total Licenses', 'Used Licenses', 'Paid Revenue'];
  const exportRows = subRows.map(r => [r.name, r.gst, r.domains, r.licenses, r.used, fmtINR(r.revenue)]);

  return (
    <div className="space-y-8">
      <ExportBar
        title="Backoffice Overview"
        subtitle="Subscription, revenue &amp; license summary across all billing entities"
        onExportCSV={() => exportCSV('backoffice', exportHeaders, exportRows.map(r => [r]))}
        onExportPDF={() => exportPDF('backoffice', 'Backoffice Overview', exportHeaders, exportRows)}
      />

      {/* Revenue summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Paid Revenue" value={fmtINR(totalRevenue)} sub="All time" icon={DollarSign} color="green" />
        <StatCard title="Pending Revenue" value={fmtINR(pendingRevenue)} sub="Awaiting payment" icon={TrendingUp} color="amber" />
        <StatCard title="Total Licenses" value={totalLicenses} sub={`${usedLicenses} in use`} icon={Package} color="blue" />
        <StatCard title="Billing Entities" value={mockBillingEntities.length} sub={`${mockBillingEntities.reduce((s, be) => s + be.domains.length, 0)} domains`} icon={Building2} color="dark" />
      </div>

      {/* Subscription overview per billing entity */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Subscription Overview by Billing Entity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Billing Entity</th>
                <th className="text-left px-5 py-3 font-medium">GST</th>
                <th className="text-left px-5 py-3 font-medium">Domains</th>
                <th className="text-left px-5 py-3 font-medium">Licenses</th>
                <th className="text-left px-5 py-3 font-medium">Utilisation</th>
                <th className="text-left px-5 py-3 font-medium">Paid Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subRows.map(row => {
                const pct = row.licenses > 0 ? Math.round((row.used / row.licenses) * 100) : 0;
                return (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{row.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{row.gst}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.domains}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.used} / {row.licenses}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full min-w-16">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#1A7DC4' }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-9 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{fmtINR(row.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* License utilization per domain */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">License Utilization per Domain</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">Domain</th>
                <th className="text-left px-5 py-3 font-medium">Billing Entity</th>
                <th className="text-left px-5 py-3 font-medium">Users</th>
                <th className="text-left px-5 py-3 font-medium">Storage</th>
                <th className="text-left px-5 py-3 font-medium">Plan Mix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockBillingEntities.flatMap(be =>
                be.domains.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1A7DC4]">{d.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{be.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-slate-400" />
                        {d.userCount}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full min-w-16">
                          <div className="h-2 rounded-full bg-[#29ABE2]" style={{ width: `${Math.round((parseInt(d.storageUsed) / parseInt(d.storageTotal)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{d.storageUsed} / {d.storageTotal}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {planOrder.map(p => {
                          const alloc = be.licensePool[p].allocated;
                          if (!alloc) return null;
                          return (
                            <span key={p} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: mockPlans[p].color + '22', color: mockPlans[p].color }}>
                              {mockPlans[p].name}: {be.licensePool[p].used}/{alloc}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoice summary */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Invoice Summary</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
              <th className="text-left px-5 py-3 font-medium">Invoice #</th>
              <th className="text-left px-5 py-3 font-medium">Billing Entity</th>
              <th className="text-left px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#1A7DC4]">{inv.number}</td>
                <td className="px-5 py-3.5 text-slate-700">{inv.billingEntity}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-800">{fmtINR(inv.amount)}</td>
                <td className="px-5 py-3.5 text-slate-500 text-xs">{inv.date}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
