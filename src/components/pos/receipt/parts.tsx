import React from 'react';
import { type ReceiptCtx } from './types';

export const RECEIPT_WATERMARK = (
  <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed rgba(0,0,0,0.3)', paddingTop: '8px', marginBottom: '2px', fontSize: '7.5px', letterSpacing: '1px', fontWeight: 600, opacity: 0.8, fontFamily: 'system-ui, sans-serif' }}>POWERED BY ZAYNAHSPOS.COM</div>
);

export function TwoCol(props: any) {
  const { ctx, left, right, bold = false, lg = false, style = {} } = props;
  const { clamp, baseWeight, fs } = ctx;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontWeight: bold ? clamp(baseWeight + 200) : baseWeight, fontSize: lg ? `${fs.total}px` : 'inherit', margin: '2px 0', ...style }} cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td style={{ textAlign: 'left', textTransform: 'uppercase', padding: 0, verticalAlign: 'top' }}>{left}</td>
          <td style={{ textAlign: 'right', textTransform: 'uppercase', padding: 0, verticalAlign: 'top' }}>{right}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function renderLogo(ctx: ReceiptCtx, style: React.CSSProperties) {
  const { settings } = ctx;
  if (!settings.receiptShowLogo) return null;
  if (settings.storeLogo) {
    return <img src={settings.storeLogo} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ ...style, objectFit: 'contain' }} />;
  }
  return null;
}
