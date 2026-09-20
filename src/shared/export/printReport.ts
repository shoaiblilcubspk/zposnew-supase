import type { ReportExportConfig } from './exportEngine';
import { DEFAULT_BRAND, getColumnLabel } from './exportEngine';

export function printReport(config: ReportExportConfig) {
  const brand = config.brand || DEFAULT_BRAND;
  const currencySymbol = config.currencySymbol || '';
  const paperSize = config.paperSize || 'A4';
  const isThermal = paperSize === '80mm' || paperSize === '58mm';
  const cssWidth = paperSize === '58mm' ? '58mm' : paperSize === '80mm' ? '80mm' : '100%';

  const escapeHtml = (v: string) =>
    String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const formatVal = (col: any, row: any) => {
    const raw = row[col.key];
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof col.format === 'function') {
      try { return col.format(raw, row) ?? ''; } catch { return String(raw); }
    }
    if (col.format === 'number') {
      const n = Number(raw);
      return isNaN(n) ? String(raw) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (col.format === 'currency') {
      const n = Number(raw);
      if (isNaN(n)) return String(raw);
      return `${currencySymbol ? currencySymbol + ' ' : ''}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (col.format === 'date') {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
    }
    return String(raw);
  };

  const isNumericCol = (c: any) => c.format === 'number' || c.format === 'currency';

  const headers = config.columns
    .map(c => `<th class="${isNumericCol(c) ? 'num' : 'text'}">${escapeHtml(getColumnLabel(c))}</th>`)
    .join('');

  const body = config.rows.map(row => {
    const tds = config.columns.map(c =>
      `<td class="${isNumericCol(c) ? 'num' : 'text'}">${escapeHtml(formatVal(c, row))}</td>`
    ).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) return;

  const thermalCss = isThermal ? `
    body { width: ${cssWidth}; padding: 4px; font-size: ${paperSize === '58mm' ? '9px' : '11px'}; color: #000; }
    .brand-header { flex-direction: column; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
    .brand-name { font-size: ${paperSize === '58mm' ? '12px' : '16px'}; color: #000; }
    h1 { font-size: ${paperSize === '58mm' ? '10px' : '12px'}; color: #000; margin-top: 4px; }
    .meta { font-size: ${paperSize === '58mm' ? '8px' : '9px'}; color: #000; }
    table { font-size: ${paperSize === '58mm' ? '8px' : '9px'}; margin-top: 8px; }
    th { background: transparent; color: #000; border-bottom: 1px solid #000; padding: 4px 2px; }
    td { padding: 4px 2px; border-bottom: 1px dotted #ccc; color: #000; }
    .footer { margin-top: 12px; font-size: ${paperSize === '58mm' ? '7px' : '8px'}; color: #000; }
  ` : `
    body { padding: 24px; color: #0f172a; }
    .brand-header { flex-direction: row; align-items: center; gap: 12px; border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 16px; }
    .brand-name { font-size: 18px; color: #10b981; }
    h1 { font-size: 14px; }
    .meta { font-size: 10px; color: #6b7280; }
    table { margin-top: 14px; }
    th { background: #10b981; color: #fff; font-size: 9px; padding: 7px 8px; }
    td { font-size: 9.5px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 18px; font-size: 8px; color: #9ca3af; }
  `;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(config.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .brand-header { display: flex; }
    .brand-header img { height: 36px; width: auto; }
    .brand-name { font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
    h1 { font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
    .meta { margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: monospace, monospace; }
    th.text, td.text { text-align: left; }
    .footer { text-align: center; }
    ${thermalCss}
    @media print { 
      body { padding: 0; ${isThermal ? `width: ${cssWidth};` : ''} } 
      ${isThermal ? `@page { margin: 0; size: ${cssWidth} auto; }` : `@page { margin: 10mm; size: auto; }`}
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <img src="${escapeHtml(brand.logo || '')}" alt="" onerror="this.style.display='none'" />
    <div>
      <div class="brand-name">${escapeHtml(brand.name)}</div>
      <h1>${escapeHtml(config.title)}</h1>
      <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
      ${config.filtersSummary ? `<div class="meta">${escapeHtml(config.filtersSummary)}</div>` : ''}
      ${config.subtitle ? `<div class="meta">${escapeHtml(config.subtitle)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="footer">${escapeHtml(brand.name)} — ${escapeHtml(config.title)} — Generated ${escapeHtml(new Date().toLocaleString())}</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
  win.document.close();
}
