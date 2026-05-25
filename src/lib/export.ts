export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(','), ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportPDF(filename: string, title: string, headers: string[], rows: (string | number)[][]) {
  const html = `
    <html><head><title>${title}</title>
    <style>body{font-family:Inter,sans-serif;padding:24px}h1{font-size:18px;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#1A7DC4;color:#fff;padding:8px 12px;text-align:left;font-size:12px}td{padding:7px 12px;border-bottom:1px solid #e2e8f0;font-size:12px}tr:nth-child(even)td{background:#F0F7FF}</style>
    </head><body>
    <h1>${title}</h1>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></body></html>
  `;
  const blob = new Blob([html], { type: 'text/html' });
  triggerDownload(blob, `${filename}.html`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}
