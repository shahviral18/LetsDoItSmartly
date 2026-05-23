import { Download } from 'lucide-react';

interface ExportBarProps {
  title: string;
  subtitle?: string;
  onExportCSV: () => void;
  onExportPDF: () => void;
  children?: React.ReactNode;
}

export default function ExportBar({ title, subtitle, onExportCSV, onExportPDF, children }: ExportBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <Download size={14} />
          CSV
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1A7DC4] bg-[#1A7DC4] text-white text-sm font-medium hover:bg-[#0D5A96] transition-colors"
        >
          <Download size={14} />
          PDF
        </button>
      </div>
    </div>
  );
}
