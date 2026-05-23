import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: 'blue' | 'dark' | 'accent' | 'green' | 'amber' | 'red';
}

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-[#1A7DC4]', border: 'border-blue-100' },
  dark: { bg: 'bg-[#F0F7FF]', icon: 'text-[#0D5A96]', border: 'border-[#c8dff5]' },
  accent: { bg: 'bg-sky-50', icon: 'text-[#29ABE2]', border: 'border-sky-100' },
  green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-100' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
};

export default function StatCard({ title, value, sub, icon: Icon, color = 'blue' }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex items-start gap-4`}>
      <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm ${c.icon}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
