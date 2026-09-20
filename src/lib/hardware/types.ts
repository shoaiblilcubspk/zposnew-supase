/**
 * Hardware & Thermal Printer Types
 */

export type PrinterTransport = 'network' | 'usb' | 'bluetooth' | 'browser';
export type PaperWidth = '80mm' | '58mm';

export interface PrinterConfig {
  transport: PrinterTransport;
  address?: string; // Network IP:Port e.g. "192.168.1.200:9100" or USB device id
  paperSize: PaperWidth;
  autoCut: boolean;
  kickCashDrawer: boolean;
  beepOnPrint: boolean;
  encoding?: string;
}

export interface ReceiptItemData {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptPrintPayload {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceNumber: string;
  date: Date | string | number;
  items: ReceiptItemData[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  tendered?: number;
  change?: number;
  footerNote?: string;
  cashierName?: string;
}
