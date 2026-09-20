import { useAppStore, useSettingsStore, useUsersStore } from '../../../stores';
import { type Sale } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { getCountryByCode } from '../../../lib/countries';
import { computeGrouped } from './grouping';
import { RECEIPT_WATERMARK } from './parts';
import { type ReceiptCtx } from './types';

export function useReceiptCtx(sale: Sale): ReceiptCtx {
  const appSettings = useSettingsStore(s => s.settings);
  const appBundles = useAppStore(s => s.bundles);
  const appUsers = useUsersStore(s => s.users);

  const resolvedSalesmanName = sale.salesmanName || (sale.salesmanId ? appUsers.find(u => u.id === sale.salesmanId)?.name : undefined);
  const activeSale = resolvedSalesmanName ? { ...sale, salesmanName: resolvedSalesmanName } : sale;

  const { profile } = useAuth();
  const settings = appSettings;

  const showDiscount = settings.receiptShowDiscount !== false &&
    !(sale.items || []).some((item: any) => item.bundleHideItemPrices === true || item.bundle_hide_item_prices === true);

  const is58mm = settings.receiptPaperSize === '58mm';
  const isA4 = settings.receiptPaperSize === 'A4';
  const paperWidthPx = is58mm ? '219px' : isA4 ? '794px' : '302px';
  const pageSizeCSS = is58mm ? '58mm auto' : isA4 ? 'A4' : '80mm auto';

  const scale = settings.receiptFontScale || 1;
  const sz = (base: number) => Math.round(base * scale);

  const rawWeight = Number(settings.receiptFontWeight);
  const baseWeight = settings.receiptFontBold
    ? 700
    : ((!isNaN(rawWeight) && rawWeight > 0) ? rawWeight : (is58mm ? 400 : isA4 ? 600 : 500));
  const clamp = (w: number) => {
    const val = Number(w);
    if (isNaN(val)) return 400;
    return Math.max(100, Math.min(700, val));
  };

  const fs = {
    shopName: sz(is58mm ? 14 : isA4 ? 24 : 18),
    body: sz(is58mm ? 9 : isA4 ? 13 : 11),
    total: sz(is58mm ? 13 : isA4 ? 20 : 16),
    footer: sz(is58mm ? 8 : isA4 ? 12 : 10),
    meta: sz(is58mm ? 9 : isA4 ? 12 : 10),
  };

  const template = settings.receiptTemplate || 'modern';

  const fontFamily = (() => {
    switch (template) {
      case 'classic': return "'Courier New', Courier, monospace";
      case 'professional': return "'Georgia', 'Times New Roman', serif";
      default: return "'Helvetica', 'Arial', sans-serif";
    }
  })();

  const headerBorder = (() => {
    switch (template) {
      case 'classic': return '1px dashed black';
      case 'professional': return '3px double black';
      case 'minimal': return 'none';
      case 'bold': case 'compact': return '2px solid black';
      default: return '1px solid black';
    }
  })();

  const totalBorder = (() => {
    switch (template) {
      case 'classic': return '1px dashed black';
      case 'professional': return '3px double black';
      case 'minimal': return 'none';
      case 'bold': case 'compact': return '3px solid black';
      default: return '1px solid black';
    }
  })();

  const tracking = (() => {
    switch (template) {
      case 'classic': return '3px';
      case 'professional': return '2px';
      case 'minimal': return '1px';
      case 'bold': case 'compact': return '0px';
      default: return '2px';
    }
  })();

  const padTop = typeof settings.receiptPaddingTop === 'number' ? settings.receiptPaddingTop : (isA4 ? 15 : 2);
  const padBottom = typeof settings.receiptPaddingBottom === 'number' ? settings.receiptPaddingBottom : (isA4 ? 15 : 10);
  const padLeft = typeof settings.receiptPaddingLeft === 'number' ? settings.receiptPaddingLeft : (isA4 ? 24 : 2);
  const padRight = typeof settings.receiptPaddingRight === 'number' ? settings.receiptPaddingRight : (isA4 ? 24 : 2);
  const offsetX = settings.receiptOffsetX || 0;
  const currencyCode = settings.currency || 'PKR';

  const currentCountry = getCountryByCode(settings.country || 'PK');
  const taxLabel = currentCountry?.taxLabel || 'Tax';

  const bodyPadL = `${Math.max(0, padLeft)}mm`;
  const bodyPadR = `${Math.max(0, padRight)}mm`;

  const { shBundles, shStandalone, bd, shDealDiscount, shItemDiscount, shBillDiscount } = computeGrouped(activeSale, appBundles);

  const baseContainer: React.CSSProperties = {
    width: paperWidthPx, maxWidth: paperWidthPx, margin: '0 auto', position: 'relative',
    paddingTop: `${Math.max(0, padTop)}mm`, paddingBottom: `${Math.max(0, padBottom)}mm`,
    paddingLeft: `${Math.max(0, padLeft)}mm`, paddingRight: `${Math.max(0, padRight)}mm`,
    left: `${settings.receiptOffsetX || 0}mm`, marginTop: padTop < 0 ? `${padTop}mm` : '0',
    marginBottom: padBottom < 0 ? `${padBottom}mm` : '0',
    fontFamily, fontSize: `${fs.body}px`, fontWeight: baseWeight, color: '#000', background: '#fff',
    lineHeight: '1.4', wordWrap: 'break-word', overflowWrap: 'break-word',
  };

  const refundWatermark = activeSale.status === 'refunded' ? (
    <div style={{ border: '2px solid black', padding: '8px', textAlign: 'center', margin: '10px 0', fontWeight: clamp(baseWeight + 300), fontSize: `${fs.shopName}px`, textTransform: 'uppercase' }}>*** REFUNDED ***</div>
  ) : null;

  const editWatermark = activeSale.editedFromInvoice ? (
    <div style={{ border: '2px solid black', padding: '8px', textAlign: 'center', margin: '10px 0', fontWeight: clamp(baseWeight + 300), fontSize: `${fs.shopName}px`, textTransform: 'uppercase', color: '#7c3aed' }}>*** EDITED FROM INV #{activeSale.editedFromInvoice} ***</div>
  ) : null;

  const notesBox = settings.receiptShowNotes && activeSale.notes ? (
    <div style={{ border: '2px solid black', padding: '6px', textAlign: 'center', margin: '12px auto', width: '90%', wordWrap: 'break-word', textTransform: 'uppercase', fontWeight: clamp(baseWeight + 100) }}>{activeSale.notes}</div>
  ) : null;

  const ctx: ReceiptCtx = {
    sale: activeSale,
    settings,
    profile,
    appBundles,
    fs,
    baseWeight,
    clamp,
    currencyCode,
    showDiscount,
    is58mm,
    isA4,
    template,
    headerBorder,
    totalBorder,
    tracking,
    taxLabel,
    paperWidthPx,
    pageSizeCSS,
    fontFamily,
    padTop,
    padBottom,
    padLeft,
    padRight,
    offsetX,
    bodyPadL,
    bodyPadR,
    shBundles,
    shStandalone,
    shDealDiscount,
    shItemDiscount,
    shBillDiscount,
    bd,
    baseContainer,
    RECEIPT_WATERMARK,
    refundWatermark,
    editWatermark,
    notesBox,
  };

  return ctx;
}
