import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * exportEngine — THE single shared source of truth for ALL business report
 * exports (PDF / Excel / CSV / Print) across the entire app.
 *
 * No page-specific logic lives here. It only knows how to render a generic
 * tabular report from a generic config. Every page passes its own
 * data / columns / title / filter-summary via <ExportButton> props.
 *
 * Explicitly separate systems (DO NOT route through here):
 *  - Full database backup/restore (BackupTab / DatabaseTools / InventoryManager JSON)
 *  - POS receipts & KOT prints (pos/ReceiptPrint.tsx, pos/KOTPrint.tsx)
 *  - Barcode label printing (BarcodeGenerator)
 */

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'print';

export type ExportColumnFormat =
  | 'string'
  | 'number'
  | 'currency'
  | 'date'
  | ((value: any, row: Record<string, any>) => string);

export interface ExportColumn {
  key: string;
  label?: string;
  header?: string;
  format?: ExportColumnFormat;
}

export function getColumnLabel(col: ExportColumn): string {
  return col.label || col.header || col.key || '';
}

export interface ReportExportConfig {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  filtersSummary?: string;
  brand?: { name: string; logo?: string };
  filename?: string;
  currencySymbol?: string;
  paperSize?: string;
}

export const DEFAULT_BRAND = { name: 'Zaynahs POS', logo: '/zaynahs-logo.svg' };

/* ─── Low-level helpers (safe to reuse from backup tooling) ─── */

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9\-_ ]/gi, '_').replace(/\s+/g, '_').replace(/_+/g, '_');
}

export function defaultFilename(title: string, ext: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${safeFilename(title)}_${date}.${ext}`;
}

/* ─── Value formatting (mirrors on-screen display; no silent drops) ─── */

function formatValue(
  col: ExportColumn,
  row: Record<string, any>,
  currencySymbol: string
): string {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === '') return '';

  if (typeof col.format === 'function') {
    try {
      const v = col.format(raw, row);
      return v ?? '';
    } catch {
      return String(raw);
    }
  }

  switch (col.format) {
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? String(raw) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    case 'currency': {
      const n = Number(raw);
      if (isNaN(n)) return String(raw);
      const symbol = currencySymbol ? `${currencySymbol} ` : '';
      return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    case 'date': {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
    }
    default:
      return String(raw);
  }
}

function excelValue(col: ExportColumn, row: Record<string, any>): string | number {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === '') return '';
  // Keep numbers numeric for real Excel math; everything else as display string
  if (col.format === 'number' || col.format === 'currency') {
    const n = Number(raw);
    if (!isNaN(n)) return n;
  }
  return formatValue(col, row, '');
}

/* ─── CSV ─── */

export function exportToCSV(config: ReportExportConfig) {
  const csvEsc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];

  if (config.title) lines.push(csvEsc(config.title));
  if (config.filtersSummary) lines.push(csvEsc(config.filtersSummary));
  lines.push(csvEsc(`Generated: ${new Date().toLocaleString()}`));

  lines.push(config.columns.map(c => csvEsc(getColumnLabel(c))).join(','));
  for (const row of config.rows) {
    lines.push(config.columns.map(c => csvEsc(formatValue(c, row, config.currencySymbol || ''))).join(','));
  }

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, config.filename || defaultFilename(config.title, 'csv'));
}

/* ─── Excel (XLSX via SheetJS) ─── */

export function exportToExcel(config: ReportExportConfig) {
  const aoa: (string | number)[][] = [];
  if (config.title) aoa.push([config.title]);
  if (config.subtitle) aoa.push([config.subtitle]);
  if (config.filtersSummary) aoa.push([config.filtersSummary]);
  aoa.push([`Generated: ${new Date().toLocaleString()}`]);
  aoa.push([]);

  aoa.push(config.columns.map(c => getColumnLabel(c)));
  for (const row of config.rows) {
    aoa.push(config.columns.map(c => excelValue(c, row)));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = config.columns.map(c => {
    const headerLen = getColumnLabel(c).length;
    let maxContentLen = headerLen;
    const sample = config.rows.slice(0, 100);
    for (const r of sample) {
      const v = String(r[c.key] ?? '');
      if (v.length > maxContentLen) maxContentLen = v.length;
    }
    return { wch: Math.min(Math.max(maxContentLen + 3, 14), 45) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, config.filename || defaultFilename(config.title, 'xlsx'));
}

/* ─── PDF (jsPDF v4 — native table support) ─── */

export async function exportToPDF(config: ReportExportConfig) {
  const requestedPaper = config.paperSize || 'A4';
  const isThermal = (requestedPaper === '80mm' || requestedPaper === '58mm') && config.columns.length <= 4;
  const orientation = isThermal ? 'portrait' : (config.columns.length > 5 ? 'landscape' : 'portrait');
  const format = isThermal ? (requestedPaper === '58mm' ? [58, 400] : [80, 400]) : 'a4';

  const doc = new jsPDF({ orientation, format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = isThermal ? 4 : 12;
  const brand = config.brand || DEFAULT_BRAND;

  // Branded header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isThermal ? 10 : 15);
  doc.setTextColor(16, 185, 129); // --color-primary
  doc.text(brand.name, margin, isThermal ? 8 : 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isThermal ? 8 : 11);
  doc.setTextColor(15, 23, 42);
  doc.text(config.title, margin, isThermal ? 13 : 23);

  doc.setFontSize(isThermal ? 6 : 8);
  doc.setTextColor(107, 114, 128);
  let metaY = isThermal ? 17 : 28;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, metaY);
  if (config.filtersSummary) {
    metaY += (isThermal ? 3 : 4);
    doc.text(config.filtersSummary, margin, metaY);
  }
  if (config.subtitle) {
    metaY += (isThermal ? 3 : 4);
    doc.text(config.subtitle, margin, metaY);
  }

  // Brand rule line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(margin, metaY + (isThermal ? 2 : 3), pageWidth - margin, metaY + (isThermal ? 2 : 3));

  // Table — keyed by header label (jsPDF v4 signature)
  const headers = config.columns.map(c => getColumnLabel(c));
  const rowsForTable = config.rows.map(row => {
    const obj: Record<string, string> = {};
    config.columns.forEach(c => {
      obj[getColumnLabel(c)] = formatValue(c, row, config.currencySymbol || '');
    });
    return obj;
  });

  doc.table(margin, metaY + (isThermal ? 5 : 7), rowsForTable, headers, {
    fontSize: isThermal ? 5 : 7.5,
    padding: isThermal ? 1 : 1.5,
    headerBackgroundColor: '#10b981',
    headerTextColor: '#ffffff',
    autoSize: true,
    margins: { top: metaY + (isThermal ? 5 : 7), bottom: isThermal ? 4 : 12, left: margin, width: pageWidth - margin * 2 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(isThermal ? 5 : 7);
  doc.setTextColor(156, 163, 175);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`${brand.name} — ${config.title} — Page ${i} of ${pageCount}`, margin, doc.internal.pageSize.getHeight() - (isThermal ? 3 : 6));
  }

  doc.save(config.filename || defaultFilename(config.title, 'pdf'));
}

export { printReport } from './printReport';

