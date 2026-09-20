import { formatCurrency } from '../../lib/currencies';
import { formatAppDate, formatAppTime } from '../../lib/dateUtils';
import { AppSettings } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { BarcodePreview } from '../../shared/ui/BarcodePreview';

export interface PreviewBlocksCtx {
  settings: AppSettings;
  fs: any;
  baseWeight: number;
  clamp: (w: number) => number;
  containerRef: React.RefObject<HTMLDivElement>;
  paperWidthPx: string;
  fitScale: number;
  padTop: number;
  padBottom: number;
  fontFamily: string;
  is58mm: boolean;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLabel: string;
  bodyStyle: React.CSSProperties;
}

export function createPreviewBlocks(ctx: PreviewBlocksCtx) {
  const { settings, fs, baseWeight, clamp, containerRef, paperWidthPx, fitScale, padTop, padBottom, fontFamily, is58mm, subtotal, discountAmount, taxAmount, taxLabel } = ctx;

  const RECEIPT_WATERMARK = <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.3)', paddingTop: '8px', marginBottom: '2px', fontSize: '7.5px', letterSpacing: '1px', fontWeight: 600, opacity: 0.8, fontFamily: 'system-ui, sans-serif' }}>POWERED BY ZAYNAHSPOS.COM</div>;

  const TwoCol = ({ left, right, bold = false, lg = false, style = {} }: any) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontWeight: bold ? clamp(baseWeight + 200) : baseWeight, fontSize: lg ? `${fs.total}px` : 'inherit', margin: '2px 0', ...style }} cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td style={{ textAlign: 'left', textTransform: 'uppercase', padding: 0, verticalAlign: 'top' }}>{left}</td>
          <td style={{ textAlign: 'right', textTransform: 'uppercase', padding: 0, verticalAlign: 'top' }}>{right}</td>
        </tr>
      </tbody>
    </table>
  );

  const renderLogo = (style: React.CSSProperties) => {
    if (!settings.receiptShowLogo) return null;
    if (settings.storeLogo) {
      return <img src={settings.storeLogo} alt="" style={{ ...style, objectFit: 'contain' }} />;
    }
    return null;
  };

  const previewWrap = (content: React.ReactNode) => (
    <div ref={containerRef} className="bg-neutral-100 dark:bg-app p-4 rounded-md border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center overflow-auto min-h-[500px] w-full">
      <div className="shadow-lg transition-all duration-300" style={{ width: paperWidthPx, backgroundColor: '#fff', color: '#000', transform: `scale(${fitScale})`, transformOrigin: 'top center', position: 'relative', left: `${settings.receiptOffsetX || 0}mm`, paddingTop: `${Math.max(0, padTop)}mm`, paddingBottom: `${Math.max(0, padBottom)}mm`, fontFamily, fontSize: `${fs.body}px`, fontWeight: baseWeight, lineHeight: settings.receiptDensity === 'compact' ? '1.1' : settings.receiptDensity === 'comfortable' ? '1.6' : '1.3', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
        {content}
      </div>
    </div>
  );

  const itemRows = [
    { name: '🎁 Summer Hot Deal (Bundle)', qty: 1, price: 2850, subtotal: 2850 },
    { name: 'Apple Juice (Fresh)', qty: 2, price: 450, subtotal: 900 },
    { name: 'Brown Bread 400g', qty: 1, price: 180, subtotal: 180 },
  ];

  const storeNameBlock = (
    <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.shopName}px`, textTransform: 'uppercase' }}>
      {settings.storeName || 'ZAYNAHS POS'}
    </div>
  );

  const storeInfoBlock = (
    <>
      {settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{settings.storeAddress}</div>}
      <div style={{ marginTop: '2px' }}>
        {settings.receiptShowStorePhone && <span>T: {settings.storePhone || '+92 300 0000000'}</span>}
        {settings.receiptShowStoreEmail && <span style={{ marginLeft: '6px' }}>E: {settings.storeEmail || 'contact@mystore.com'}</span>}
      </div>
      {settings.receiptHeader && <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontWeight: clamp(baseWeight + 100), fontSize: `${fs.body}px` }}>{settings.receiptHeader}</div>}
    </>
  );

  const deliveryBlock = (() => {
    const showAddress = settings.receiptShowDeliveryAddress !== false;
    const showQr = settings.receiptShowQrCode !== false;
    if (!showAddress && !showQr) return null;
    return (
      <div style={{ marginTop: '6px', borderTop: '1px dashed #ccc', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px dashed #ccc', textTransform: 'uppercase' }}>
        {showAddress && (
          <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
            Fulfillment: Home Delivery
            <div style={{ fontSize: '10px', marginTop: '3px', whiteSpace: 'pre-wrap', textAlign: 'left', fontWeight: 'normal' }}>
              Address: S | Near: S
            </div>
          </div>
        )}
        {showQr && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '4px' }}>Scan for Delivery Directions:</span>
            <QRCodeSVG value="https://www.google.com/maps/search/?api=1&query=24.8607,67.0011" size={90} level="M" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    );
  })();

  const metaBlock = (
    <>
      <TwoCol left={`INV#: ${settings.invoicePrefix || 'INV'}-001234`} right={`DATE: ${formatAppDate(new Date().toISOString(), settings.country).replace(/,/g, '')}`} />
      <TwoCol left={`TIME: ${formatAppTime(new Date(), settings.timezone)}`} right={`OP: ADMIN`} />
      {settings.receiptShowCustomerName && <TwoCol left="CUST: WALKIN CUSTOMER" right={settings.receiptShowCustomerPhone ? "PH: +92 300 0000000" : ""} />}
      {deliveryBlock}
    </>
  );

  const totalsBlock = (
    <>
      {settings.receiptShowDiscount !== false && <TwoCol left="SUBTOTAL" right={formatCurrency(subtotal, settings.currency)} />}
      {settings.receiptShowDiscount !== false && <TwoCol left="DISCOUNT" right={`-${formatCurrency(discountAmount, settings.currency)}`} />}
      {settings.receiptShowTax && <TwoCol left={`${taxLabel} (${settings.taxRate}%)`} right={formatCurrency(taxAmount, settings.currency)} />}
    </>
  );

  const paymentBlock = (
    <div style={{ marginTop: '4px', marginBottom: '4px', textTransform: 'uppercase', color: 'black' }}>
      <div style={{ textAlign: 'left' }}>PAID: CASH</div>
      <TwoCol left="CHG:" right={formatCurrency(0, settings.currency)} />
    </div>
  );

  const notesBlock = settings.receiptShowNotes ? (
    <div style={{ border: '2px solid black', padding: '6px', textAlign: 'center', margin: '12px auto', width: '90%', wordWrap: 'break-word', textTransform: 'uppercase', fontWeight: clamp(baseWeight + 100), color: 'black' }}>OKAY: DELIVER ON TIME</div>
  ) : null;

  const footerBlock = (
    <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '24px', textTransform: 'uppercase', color: 'black', position: 'relative', left: `${settings.receiptFooterOffsetX || 0}mm`, width: '100%', display: 'block' }}>
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '12px auto', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={`${settings.invoicePrefix || "INV"}-001234`} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );

  const defaultItemsTable = (
    <div style={{ marginTop: '4px', marginBottom: '4px', color: 'black' }}>
      <TwoCol left="ITEM" right="TOTAL" bold />
      {itemRows.map((item, index) => (
        <div key={index} style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
          <div style={{ textAlign: 'left', wordWrap: 'break-word' }}>{item.name}</div>
          <TwoCol left={`${item.qty} PCS x ${formatCurrency(item.price, settings.currency)}`} right={formatCurrency(item.subtotal, settings.currency)} />
        </div>
      ))}
    </div>
  );

  const renderHeaderContent = () => (
    <>
      {(settings.receiptShowLogo && settings.storeLogo) ? (
        <img src={settings.storeLogo} alt="Logo" style={{ display: 'block', margin: '0 auto', maxHeight: '80px', maxWidth: '80%', objectFit: 'contain' }} />
      ) : (
        <div style={{ margin: '0 auto', marginBottom: '8px', width: '100%', textAlign: 'center' }}>
          <QRCodeSVG value="PREVIEW-123" size={80} level="M" style={{ margin: '0 auto' }} />
        </div>
      )}
      {settings.receiptShowStoreName && (
        <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.shopName}px`, marginTop: '8px', textTransform: 'uppercase' }}>
          {settings.storeName || 'ZAYNAHS POS'}
        </div>
      )}
      {settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{settings.storeAddress}</div>}
      <div style={{ marginTop: '2px' }}>
        {settings.receiptShowStorePhone && <span>T: {settings.storePhone || '+92 300 0000000'}</span>}
        {settings.receiptShowStoreEmail && <span style={{ marginLeft: '6px' }}>E: {settings.storeEmail || 'contact@mystore.com'}</span>}
      </div>
      {settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: clamp(baseWeight + 100) }}>{settings.receiptHeader}</div>}
    </>
  );

  const renderMetaContent = () => (
    <>
      <TwoCol left={`INV#: ${settings.invoicePrefix || 'INV'}-001234`} right={`DATE: ${formatAppDate(new Date().toISOString(), settings.country).replace(/,/g, '')}`} />
      <TwoCol left={`TIME: ${formatAppTime(new Date(), settings.timezone)}`} right={`OP: ADMIN`} />
      {settings.receiptShowCustomerName && <TwoCol left="CUST: WALKIN CUSTOMER" right={settings.receiptShowCustomerPhone ? "PH: +92 300 0000000" : ""} />}
    </>
  );

  const renderDeliveryContent = () => {
    const showAddress = settings.receiptShowDeliveryAddress !== false;
    const showQr = settings.receiptShowQrCode !== false;
    if (!showAddress && !showQr) return null;
    return (
      <div style={{ marginTop: '6px', borderTop: '1px dashed #ccc', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px dashed #ccc', textTransform: 'uppercase' }}>
        {showAddress && (
          <div style={{ fontWeight: 'bold', fontSize: `${fs.meta}px` }}>
            Fulfillment: Home Delivery
            <div style={{ fontSize: `${fs.body}px`, marginTop: '3px', whiteSpace: 'pre-wrap', textAlign: 'left', fontWeight: 'normal' }}>
              Address: S | Near: S
            </div>
          </div>
        )}
        {showQr && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '4px' }}>Scan for Delivery Directions:</span>
            <QRCodeSVG value="https://www.google.com/maps/search/?api=1&query=24.8607,67.0011" size={90} level="M" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    );
  };

  const renderItemsContent = () => (
    <div style={{ marginTop: '4px', marginBottom: '4px', color: 'black' }}>
      <TwoCol left="ITEM" right="TOTAL" bold />
      {[
        { name: '🎁 Summer Hot Deal (Bundle)', qty: 1, price: 2850, subtotal: 2850 },
        { name: 'Apple Juice (Fresh)', qty: 2, price: 450, subtotal: 900 },
        { name: 'Brown Bread 400g', qty: 1, price: 180, subtotal: 180 },
      ].map((item, index) => (
        <div key={index} style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
          <div style={{ textAlign: 'left', wordWrap: 'break-word' }}>{item.name}</div>
          <TwoCol left={`${item.qty} PCS x ${formatCurrency(item.price, settings.currency)}`} right={formatCurrency(item.subtotal, settings.currency)} />
        </div>
      ))}
    </div>
  );

  const renderTotalsContent = () => (
    <>
      {settings.receiptShowDiscount !== false && <TwoCol left="SUBTOTAL" right={formatCurrency(subtotal, settings.currency)} />}
      {settings.receiptShowDiscount !== false && <TwoCol left="DISCOUNT" right={`-${formatCurrency(discountAmount, settings.currency)}`} />}
      {settings.receiptShowTax && <TwoCol left={`${taxLabel} (${settings.taxRate}%)`} right={formatCurrency(taxAmount, settings.currency)} />}
    </>
  );

  const renderFooterContent = () => (
    <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '24px', textTransform: 'uppercase', color: 'black', position: 'relative', left: `${settings.receiptFooterOffsetX || 0}mm`, width: '100%', display: 'block' }}>
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '12px auto', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={`${settings.invoicePrefix || "INV"}-001234`} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );

  return {
    RECEIPT_WATERMARK,
    TwoCol,
    renderLogo,
    previewWrap,
    itemRows,
    storeNameBlock,
    storeInfoBlock,
    deliveryBlock,
    metaBlock,
    totalsBlock,
    paymentBlock,
    notesBlock,
    footerBlock,
    defaultItemsTable,
    renderHeaderContent,
    renderMetaContent,
    renderDeliveryContent,
    renderItemsContent,
    renderTotalsContent,
    renderFooterContent,
  };
}
