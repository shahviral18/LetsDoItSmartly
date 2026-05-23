import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import type { RenewalInfo } from '../../types';

interface RenewalBannerProps {
  renewals: RenewalInfo[];
}

export function RenewalBanner({ renewals }: RenewalBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const upcoming = renewals.filter(r => r.daysUntilRenewal <= 30);

  if (dismissed || upcoming.length === 0) return null;

  const urgent = upcoming.filter(r => r.daysUntilRenewal <= 7);
  const isUrgent = urgent.length > 0;

  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5 border ${
        isUrgent
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      }`}
    >
      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold">
          {upcoming.length === 1
            ? `Renewal due in ${upcoming[0].daysUntilRenewal} day${upcoming[0].daysUntilRenewal === 1 ? '' : 's'}`
            : `${upcoming.length} renewals coming up`}
        </p>
        <ul className="mt-1 space-y-0.5">
          {upcoming.map(r => (
            <li key={r.billingEntityId} className="text-xs opacity-80">
              <span className="font-medium">{r.billingEntityName}</span>
              {' — '}renews on{' '}
              {new Date(r.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' '}(₹{r.totalAmount.toLocaleString('en-IN')})
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </div>
  );
}
