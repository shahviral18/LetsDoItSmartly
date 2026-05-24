import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success', pending: 'warning', overdue: 'danger',
};

interface ApiInvoice {
  id: number;
  invoice_number: string;
  billing_entity_name: string;
  amount: number;
  status: string;
  invoice_date: string;
  due_date: string;
}

export function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: ApiInvoice[] }>('/invoices')
      .then(r => setInvoices(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(inv =>
    (inv.invoice_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.billing_entity_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function fmt(d: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${invoices.length} invoices total`}
          </p>
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
                {['Invoice No', 'Billing Entity', 'Amount', 'Status', 'Date', 'Due Date', ''].map(h => (
                  <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center"><Loader2 size={20} className="animate-spin text-slate-300 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">No invoices found.</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-[#1A7DC4] font-medium">{inv.invoice_number}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{inv.billing_entity_name}</td>
                  <td className="px-5 py-4 text-right text-slate-800 font-semibold tabular-nums">₹{(inv.amount ?? 0).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <Badge variant={statusVariant[inv.status] ?? 'warning'}>
                      {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-slate-500 tabular-nums">{fmt(inv.invoice_date)}</td>
                  <td className="px-5 py-4 text-slate-500 tabular-nums">{fmt(inv.due_date)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#1A7DC4] hover:bg-blue-50 transition-colors">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default InvoicesPage;
