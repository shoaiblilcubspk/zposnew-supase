import { Printer } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { ReceiptPreview } from '../ReceiptPreview';
import type { AppSettings } from '../../../types';
import type { SettingsTabProps } from './types';

export function ReceiptSettingsPreview({
  formData,
  appSettings,
  profile,
  setCompletedSale,
  setShowReceipt,
}: SettingsTabProps) {
  return (
    <div className="lg:col-span-3 lg:sticky lg:top-4 bg-white dark:bg-surface rounded-md p-4 border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        Live Preview
      </h3>
      <div className="bg-white dark:bg-surface rounded-md p-3 shadow-none overflow-hidden w-full max-w-[240px] border border-neutral-200 dark:border-white/[0.08]">
        <ReceiptPreview settings={{
          ...appSettings,
          ...formData,
          taxRate: parseFloat(formData.taxRate) || 0,
          receiptFontScale: parseFloat(formData.receiptFontScale) || 1,
          invoiceCounter: parseInt(formData.invoiceCounter) || 1000,
        } as unknown as AppSettings} />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          const padDigits = formData.invoicePadDigits !== undefined ? parseInt(formData.invoicePadDigits, 10) : 4;
          const serialStr = padDigits > 0 ? (formData.invoiceCounter || '1').toString().padStart(padDigits, '0') : (formData.invoiceCounter || '1');
          const pfx = (formData.invoicePrefix || 'INV').trim().toUpperCase();
          const mockInvoice = pfx ? `${pfx}-${serialStr}` : serialStr;

          const mockSale = {
            id: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            invoiceNumber: mockInvoice,
            receiptNumber: mockInvoice,
            timestamp: new Date(),
            items: [
              { product: { id: 'p1', name: 'Sample Item 01 (Premium)', price: 1250 }, quantity: 2 },
              { product: { id: 'p2', name: 'Standard Utility Item', price: 450 }, quantity: 1 }
            ],
            subtotal: 2950,
            discountAmount: 0,
            taxAmount: 2950 * (parseFloat(formData.taxRate) / 100),
            total: 2950 * (1 + parseFloat(formData.taxRate) / 100),
            paymentMethod: 'cash' as const,
            cashier: profile?.name?.split(' ')[0] || 'ADMIN',
            salesmanName: 'Ali',
            saleType: 'retail' as const,
            saleDate: new Date().toLocaleDateString('en-CA')
          };
          setCompletedSale(mockSale as any);
          setShowReceipt(true);
        }}
        icon={<Printer className="w-3.5 h-3.5" />}
        className="mt-3 w-full h-8 text-[13px] font-medium rounded-md"
      >
        Test Print
      </Button>
    </div>
  );
}
