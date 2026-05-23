import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, Search } from 'lucide-react';
import { mockInvoices, mockRenewals } from '../../mock/data';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { RenewalBanner } from '../../components/shared/RenewalBanner';

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = mockInvoices.filter(inv =>
    inv.number.toLowerCase().includes(search.toLowerCase()) ||
    inv.billingEntity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <RenewalBanner renewals={mockRenewals} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">{mockInvoices.length} invoices total</p>
        </div>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoices…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A7DC4]/30 focus:border-[#1A7DC4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice No</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Billing Entity</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-[#1A7DC4] font-medium">{inv.number}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{inv.billingEntity}</td>
                  <td className="px-5 py-4 text-right text-slate-800 font-semibold tabular-nums">
                    ₹{inv.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={statusVariant[inv.status]}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-500 tabular-nums">
                    {new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4 text-slate-500 tabular-nums">
                    {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => navigate(`/app/invoices/${inv.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A7DC4] hover:bg-blue-50 transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A7DC4] hover:bg-blue-50 transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No invoices match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default InvoicesPage;
