import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { mockInvoices } from '../../mock/data';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  paid: 'success',
  pending: 'warning',
  overdue: 'danger',
};

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = mockInvoices.find(inv => inv.id === id);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg font-medium">Invoice not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-[#1A7DC4] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const subtotal = invoice.items.reduce((s, i) => s + i.rate * i.qty, 0);
  const totalDiscount = invoice.items.reduce((s, i) => s + i.discount, 0);
  const net = invoice.items.reduce((s, i) => s + i.net, 0);
  const gst = Math.round(net * 0.18);
  const grandTotal = net + gst;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-800">Invoice {invoice.number}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{invoice.billingEntity}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors">
            <Printer size={14} />
            Print
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1A7DC4] text-white text-sm hover:bg-[#0D5A96] transition-colors">
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      <Card className="max-w-3xl">
        <div className="px-8 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm mb-3"
                style={{ background: 'linear-gradient(135deg, #1A7DC4 0%, #29ABE2 100%)' }}
              >
                LD
              </div>
              <p className="text-sm font-semibold text-slate-700">TechnoDoc Solutions</p>
              <p className="text-xs text-slate-400 mt-0.5">Letsdoitsmartly Platform</p>
              <p className="text-xs text-slate-400">billing@technodoc.in</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-2xl font-bold text-slate-800">{invoice.number}</span>
                <Badge variant={statusVariant[invoice.status]}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Issued: {new Date(invoice.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-slate-500">
                Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Billed To */}
          <div className="mb-8 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Billed To</p>
            <p className="text-sm font-semibold text-slate-800">{invoice.billingEntity}</p>
          </div>

          {/* Line Items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item / Description</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate (₹)</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount (₹)</th>
                <th className="text-right py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Net (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-3.5 pr-4">
                    <p className="font-medium text-slate-800">{item.plan}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                  </td>
                  <td className="py-3.5 text-right text-slate-700 tabular-nums">
                    {item.rate.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 text-right text-slate-700 tabular-nums">{item.qty}</td>
                  <td className="py-3.5 text-right text-red-500 tabular-nums">
                    {item.discount > 0 ? `−${item.discount.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-3.5 text-right font-semibold text-slate-800 tabular-nums">
                    {item.net.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount</span>
                  <span className="tabular-nums">−₹{totalDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>GST (18%)</span>
                <span className="tabular-nums">₹{gst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-200 pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Thank you for your business. For any queries, contact{' '}
              <span className="text-[#1A7DC4]">billing@technodoc.in</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default InvoiceDetailPage;
