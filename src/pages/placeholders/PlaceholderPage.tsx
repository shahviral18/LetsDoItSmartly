import { Construction } from 'lucide-react';

interface Props {
  title: string;
}

export function PlaceholderPage({ title }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#F0F7FF' }}
      >
        <Construction size={24} style={{ color: '#1A7DC4' }} />
      </div>
      <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
      <p className="text-sm text-slate-400 mt-1">This section will be built in a future track.</p>
    </div>
  );
}
