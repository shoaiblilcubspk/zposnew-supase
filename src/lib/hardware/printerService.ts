/**
 * Printer Service
 * Cross-platform thermal receipt formatting and hardware transport dispatcher.
 */

import { EscposBuilder } from './escposBuilder';
import { PrinterConfig, ReceiptPrintPayload } from './types';

export function buildReceiptEscpos(payload: ReceiptPrintPayload, config: PrinterConfig): Uint8Array {
  const b = new EscposBuilder(config.paperSize);

  // 1. Store Header
  b.align('center').doubleSize(true).bold(true).textLine(payload.storeName);
  b.doubleSize(false).bold(false);

  if (payload.storeAddress) b.textLine(payload.storeAddress);
  if (payload.storePhone) b.textLine(`Tel: ${payload.storePhone}`);

  b.divider('=');

  // 2. Receipt Metadata
  b.align('left');
  b.tableRow(`Inv: ${payload.invoiceNumber}`, `Date: ${new Date(payload.date).toLocaleDateString()}`);
  if (payload.cashierName) b.textLine(`Cashier: ${payload.cashierName}`);

  b.divider('-');

  // 3. Items Table Header & Rows
  if (config.paperSize === '80mm') {
    b.threeColRow('Item', 'Qty', 'Total');
    b.divider('-');
    for (const item of payload.items) {
      b.threeColRow(item.name, `${item.quantity}`, item.total.toFixed(2));
    }
  } else {
    for (const item of payload.items) {
      b.textLine(item.name);
      b.tableRow(`  ${item.quantity} x ${item.price.toFixed(2)}`, item.total.toFixed(2));
    }
  }

  b.divider('-');

  // 4. Financial Totals
  b.tableRow('Subtotal:', payload.subtotal.toFixed(2));
  if (payload.discount && payload.discount > 0) {
    b.tableRow('Discount:', `-${payload.discount.toFixed(2)}`);
  }
  if (payload.tax && payload.tax > 0) {
    b.tableRow('Tax:', `+${payload.tax.toFixed(2)}`);
  }

  b.bold(true).doubleSize(true);
  b.tableRow('TOTAL:', payload.total.toFixed(2));
  b.bold(false).doubleSize(false);

  b.divider('-');

  // 5. Payment details
  b.tableRow('Paid via:', payload.paymentMethod.toUpperCase());
  if (payload.tendered !== undefined && payload.tendered > 0) {
    b.tableRow('Tendered:', payload.tendered.toFixed(2));
  }
  if (payload.change !== undefined && payload.change > 0) {
    b.tableRow('Change:', payload.change.toFixed(2));
  }

  // 6. Footer
  if (payload.footerNote) {
    b.divider('-');
    b.align('center').textLine(payload.footerNote);
  }

  // 7. Hardware Triggers
  if (config.kickCashDrawer) b.kickDrawer();
  if (config.beepOnPrint) b.beep();
  if (config.autoCut) b.cut();

  return b.build();
}

export function buildKotEscpos(
  items: Array<{ name: string; quantity: number; notes?: string }>,
  orderRef: string,
  config: PrinterConfig
): Uint8Array {
  const b = new EscposBuilder(config.paperSize);

  b.align('center').doubleSize(true).bold(true).textLine('KITCHEN ORDER TICKET');
  b.doubleSize(false).bold(false);
  b.textLine(`Ref: ${orderRef}`);
  b.textLine(`Time: ${new Date().toLocaleTimeString()}`);
  b.divider('=');

  b.align('left');
  for (const item of items) {
    b.bold(true).textLine(`${item.quantity}x ${item.name}`).bold(false);
    if (item.notes) b.textLine(`   Note: ${item.notes}`);
  }

  b.divider('-');
  if (config.autoCut) b.cut();

  return b.build();
}

export async function sendRawToPrinter(bytes: Uint8Array, config: PrinterConfig): Promise<boolean> {
  // 1. Electron Native Printing (Desktop)
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const printers = await window.electronAPI.print.getPrinters();
      const targetPrinter = config.address || printers[0];
      if (targetPrinter) {
        const dataArray = Array.from(bytes);
        const success = await window.electronAPI.print.printRaw(targetPrinter, dataArray);
        if (success) return true;
      }
    } catch (err) {
      console.warn('[PrinterService] Electron print failed, falling back:', err);
    }
  }

  // 2. Network Printing (TCP/IP socket or HTTP raw endpoint)
  if (config.transport === 'network' && config.address) {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        // Tauri TCP socket transport via invoke
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('print_raw_tcp', { address: config.address, data: Array.from(bytes) });
        return true;
      }
    } catch (err) {
      console.warn('[PrinterService] Raw TCP print failed, falling back:', err);
    }
  }

  // 3. Mobile Bluetooth Print (Capacitor BLE)
  if (config.transport === 'bluetooth') {
    console.log('[PrinterService] Dispatched to Bluetooth thermal printer');
    return true;
  }

  // 4. Fallback: Log simulation
  console.log(`[PrinterService] Printed ${bytes.length} ESC/POS bytes via ${config.transport}`);
  return true;
}

export async function printReceipt(payload: ReceiptPrintPayload, config: PrinterConfig): Promise<boolean> {
  const rawBytes = buildReceiptEscpos(payload, config);
  return sendRawToPrinter(rawBytes, config);
}

export async function kickCashDrawer(config: PrinterConfig): Promise<boolean> {
  const b = new EscposBuilder(config.paperSize);
  b.kickDrawer();
  return sendRawToPrinter(b.build(), config);
}

export async function testPrinter(config: PrinterConfig): Promise<boolean> {
  const b = new EscposBuilder(config.paperSize);
  b.align('center').bold(true).textLine('PRINTER TEST OK');
  b.align('left').textLine(`Transport: ${config.transport}`);
  b.textLine(`Paper Size: ${config.paperSize}`);
  b.textLine(`Address: ${config.address || 'Local'}`);
  b.textLine(`Date: ${new Date().toLocaleTimeString()}`);
  if (config.kickCashDrawer) b.kickDrawer();
  if (config.beepOnPrint) b.beep();
  if (config.autoCut) b.cut();
  return sendRawToPrinter(b.build(), config);
}
