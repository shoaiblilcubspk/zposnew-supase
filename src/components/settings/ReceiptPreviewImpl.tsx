import { formatCurrency } from '../../lib/currencies';
import { AppSettings } from '../../types';
import { useEffect, useRef, useState } from 'react';
import { renderReceiptLayout } from './ReceiptPreviewLayouts';
import { createPreviewBlocks } from './ReceiptPreviewBlocks';

interface ReceiptPreviewProps { settings: AppSettings; }

export function ReceiptPreview({ settings }: ReceiptPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 32); // subtract padding
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const is58mm = settings.receiptPaperSize === '58mm';
  const isA4 = settings.receiptPaperSize === 'A4';

  // Real-world pixel widths from chart
  const paperWidthNumeric = is58mm ? 219 : isA4 ? 794 : 302;
  const paperWidthPx = `${paperWidthNumeric}px`;

  // Scale to fit container
  const fitScale = (containerWidth > 0 && containerWidth < paperWidthNumeric)
    ? containerWidth / paperWidthNumeric
    : 1;

  // Padding Support
  const padTop = settings.receiptPaddingTop || (isA4 ? 15 : 2);
  const padBottom = settings.receiptPaddingBottom || (isA4 ? 15 : 10);
  const padLeft = settings.receiptPaddingLeft || (isA4 ? 24 : 2);
  const padRight = settings.receiptPaddingRight || (isA4 ? 24 : 2);

  const userScale = settings.receiptFontScale || 1;
  const scale = userScale * 1.0;
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

  const taxLabel = 'Tax';
  const template = settings.receiptTemplate || 'modern';
  const isNewLayout = ['horizontal_header','centered_flow','left_grid','split_columns','floating_totals','offset_logo','boxed_sections','tear_off','vertical_line','emphasized_total'].includes(template);

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
      case 'bold': case 'compact': return '3px solid black';
      default: return '1px solid black';
    }
  })();

  const dividerStyle = {
    borderTop: headerBorder,
    width: '100%',
    margin: '6px 0',
  };

  const subDividerStyle = {
    borderTop: template === 'classic' ? '1px dashed black' : '1px solid black',
    width: '100%',
    margin: '4px 0',
  };

  const discountAmount = settings.receiptShowDiscount !== false ? 80 : 0;
  const taxRateVal = parseFloat(settings.taxRate?.toString() || '0') || 0;
  const subtotal = 1080;
  const taxAmount = settings.receiptShowTax ? (subtotal - discountAmount) * (taxRateVal / 100) : 0;
  const total = subtotal - discountAmount + taxAmount;

  const bodyStyle: React.CSSProperties = {
    paddingLeft: `${Math.max(0, padLeft)}mm`,
    paddingRight: `${Math.max(0, padRight)}mm`,
    position: 'relative',
    left: `${(padLeft < 0 ? padLeft : 0) - (padRight < 0 ? padRight : 0)}mm`,
  };

  const blocks = createPreviewBlocks({ settings, fs, baseWeight, clamp, containerRef, paperWidthPx, fitScale, padTop, padBottom, fontFamily, is58mm, subtotal, discountAmount, taxAmount, taxLabel, bodyStyle });
  const { TwoCol, previewWrap, renderLogo, itemRows, storeNameBlock, storeInfoBlock, metaBlock, totalsBlock, paymentBlock, notesBlock, footerBlock, defaultItemsTable, renderHeaderContent, renderMetaContent, renderDeliveryContent, renderItemsContent, renderTotalsContent, renderFooterContent, RECEIPT_WATERMARK } = blocks;

  if (isNewLayout) {
    return renderReceiptLayout({
      template, settings, bodyStyle, fs, baseWeight, RECEIPT_WATERMARK,
      metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock,
      footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total,
      subtotal, discountAmount, taxAmount, taxLabel, is58mm, previewWrap, TwoCol, itemRows
    });
  }

  return (
    <div ref={containerRef} className="bg-neutral-100 dark:bg-app p-4 rounded-md border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center overflow-auto min-h-[500px] w-full">
      <div className="shadow-lg transition-all duration-300" style={{ width: paperWidthPx, backgroundColor: '#fff', color: '#000', transform: `scale(${fitScale})`, transformOrigin: 'top center', position: 'relative', left: `${settings.receiptOffsetX || 0}mm`, paddingTop: `${Math.max(0, padTop)}mm`, paddingBottom: `${Math.max(0, padBottom)}mm`, marginTop: padTop < 0 ? `${padTop}mm` : '0', marginBottom: `calc(-100% * (1 - ${fitScale}) + ${padBottom < 0 ? padBottom : 0}mm)`, fontFamily, fontSize: `${fs.body}px`, fontWeight: baseWeight, lineHeight: settings.receiptDensity === 'compact' ? '1.1' : settings.receiptDensity === 'comfortable' ? '1.6' : '1.3', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
        {template !== 'minimal' && <div style={dividerStyle} />}
        <div style={{ textAlign: 'center', margin: '8px 0', color: 'black', position: 'relative', left: `${settings.receiptHeaderOffsetX || 0}mm`, width: '100%', display: 'block' }}>
          {renderHeaderContent()}
        </div>
        <div style={bodyStyle}>
          {template !== 'minimal' && <div style={dividerStyle} />}
          {renderMetaContent()}
          {renderDeliveryContent()}
          {template !== 'minimal' && <div style={subDividerStyle} />}
          {renderItemsContent()}
          {template !== 'minimal' && <div style={dividerStyle} />}
          {renderTotalsContent()}
          {template !== 'minimal' && <div style={dividerStyle} />}
          <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
          {template !== 'minimal' && <div style={dividerStyle} />}
          <div style={{ marginTop: '4px', marginBottom: '4px', textTransform: 'uppercase', color: 'black' }}>
            <div style={{ textAlign: 'left' }}>PAID: CASH</div>
            <TwoCol left="CHG:" right={formatCurrency(0, settings.currency)} />
          </div>
          {settings.receiptShowNotes && (
            <div style={{ border: '2px solid black', padding: '6px', textAlign: 'center', margin: '12px auto', width: '90%', wordWrap: 'break-word', textTransform: 'uppercase', fontWeight: clamp(baseWeight + 100), color: 'black' }}>OKAY: DELIVER ON TIME</div>
          )}
          {template !== 'minimal' && <div style={dividerStyle} />}
        </div>
        {renderFooterContent()}
        {template !== 'minimal' && <div style={dividerStyle} />}
      </div>
    </div>
  );
}
