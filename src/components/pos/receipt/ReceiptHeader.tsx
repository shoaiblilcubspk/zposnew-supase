import { QRCodeSVG } from 'qrcode.react';
import { formatAppDate, formatAppTime } from '../../../lib/dateUtils';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function renderHeaderSection(ctx: ReceiptCtx) {
  const { settings, sale, fs, baseWeight, clamp } = ctx;
  return (
    <div style={{ textAlign: 'center', margin: '8px 0', position: 'relative', left: `${settings.receiptHeaderOffsetX || 0}mm`, width: '100%', display: 'block' }}>
      {(settings.receiptShowLogo && settings.storeLogo) ? (
        <img src={settings.storeLogo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ display: 'block', margin: '0 auto', maxHeight: '80px', maxWidth: '80%', objectFit: 'contain' }} />
      ) : (
        <div style={{ margin: '0 auto', marginBottom: '8px', width: '100%', textAlign: 'center' }}>
          <QRCodeSVG value={sale.invoiceNumber} size={80} level="M" aria-hidden="true" style={{ margin: '0 auto' }} />
        </div>
      )}
      {settings.receiptShowStoreName && <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.shopName}px`, marginTop: '8px', textTransform: 'uppercase' }}>{settings.storeName}</div>}
      {settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{settings.storeAddress}</div>}
      <div style={{ marginTop: '2px' }}>
        {settings.receiptShowStorePhone && <span>T: {settings.storePhone}</span>}
        {settings.receiptShowStoreEmail && <span style={{ marginLeft: '6px' }}>E: {settings.storeEmail}</span>}
      </div>
      {settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: clamp(baseWeight + 100) }}>{settings.receiptHeader}</div>}
    </div>
  );
}

export function renderDeliveryDetailsSection(ctx: ReceiptCtx) {
  const { sale, settings, fs } = ctx;
  if (!sale.deliveryAddress) return null;
  const isPickup = sale.deliveryAddress === 'SELF-PICKUP';
  const showAddress = settings.receiptShowDeliveryAddress !== false;
  const showQr = settings.receiptShowQrCode !== false;
  const directionsUrl = (sale.deliveryLocationLat && sale.deliveryLocationLng)
    ? `https://www.google.com/maps/search/?api=1&query=${sale.deliveryLocationLat},${sale.deliveryLocationLng}`
    : null;

  if (!showAddress && !showQr) return null;

  return (
    <div style={{ marginTop: '6px', borderTop: '1px dashed #ccc', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px dashed #ccc', textTransform: 'uppercase' }}>
      {showAddress && (
        <>
          <div style={{ fontWeight: 'bold', fontSize: `${fs.meta}px` }}>
            Fulfillment: {isPickup ? 'Self-Pickup' : 'Home Delivery'}
          </div>
          {!isPickup && (
            <div style={{ fontSize: `${fs.body}px`, marginTop: '3px', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              Address: {sale.deliveryAddress}
            </div>
          )}
        </>
      )}
      {showQr && directionsUrl && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '7px', fontWeight: 'bold', marginBottom: '4px' }}>Scan for Delivery Directions:</span>
          <QRCodeSVG value={directionsUrl} size={90} level="M" style={{ margin: '0 auto' }} />
        </div>
      )}
    </div>
  );
}

export function renderMetaSection(ctx: ReceiptCtx) {
  const { sale, settings, profile } = ctx;
  const tz = settings.timezone || settings.country;
  return (
    <>
      <TwoCol ctx={ctx} left={`INV#: ${(sale.invoiceNumber || sale.receiptNumber || sale.id.slice(-6).toUpperCase()).replace(new RegExp(`^${settings.invoicePrefix || 'INV'}-?`, 'i'), '')}`} right={`DATE: ${formatAppDate(sale.timestamp, tz).replace(/,/g, '')}`} />
      <TwoCol ctx={ctx} left={`TIME: ${formatAppTime(sale.timestamp, tz)}`} right={`OP: ${sale.cashier?.split(' ')[0] || profile?.name?.split(' ')[0] || 'SYS'}`} />
      {sale.salesmanName && <TwoCol ctx={ctx} left={`SM: ${sale.salesmanName}`} right="" />}
      {sale.dcNumber && <TwoCol ctx={ctx} left={`DC#: ${sale.dcNumber}`} right="" />}
      {settings.receiptShowTax && settings.taxId && <TwoCol ctx={ctx} left={`TAX/NTN ID: ${settings.taxId}`} right="" />}
      {settings.receiptShowCustomerName && sale.customerName && (
        <TwoCol ctx={ctx} left={`CUST: ${sale.customerName}`} right={settings.receiptShowCustomerPhone && sale.customerPhone ? `PH: ${sale.customerPhone}` : ""} />
      )}
      {renderDeliveryDetailsSection(ctx)}
    </>
  );
}

export function MonoMeta(ctx: ReceiptCtx) {
  const { sale, settings, profile } = ctx;
  const tz = settings.timezone || settings.country;
  return (
    <>
      <TwoCol ctx={ctx} left={`INV#: ${(sale.invoiceNumber || sale.receiptNumber || sale.id.slice(-6).toUpperCase()).replace(new RegExp(`^${settings.invoicePrefix || 'INV'}-?`, 'i'), '')}`} right={`DATE: ${formatAppDate(sale.timestamp, tz).replace(/,/g, '')}`} />
      <TwoCol ctx={ctx} left={`TIME: ${formatAppTime(sale.timestamp, tz)}`} right={`OP: ${sale.cashier?.split(' ')[0] || profile?.name?.split(' ')[0] || 'SYS'}`} />
      {sale.salesmanName && (<TwoCol ctx={ctx} left={`SM: ${sale.salesmanName}`} right="" />)}
      {sale.dcNumber && (<TwoCol ctx={ctx} left={`DC#: ${sale.dcNumber}`} right="" />)}
      {settings.receiptShowCustomerName && sale.customerName && (
        <TwoCol ctx={ctx} left={`CUST: ${sale.customerName}`} right={settings.receiptShowCustomerPhone && sale.customerPhone ? `PH: ${sale.customerPhone}` : ""} />
      )}
      {renderDeliveryDetailsSection(ctx)}
    </>
  );
}
