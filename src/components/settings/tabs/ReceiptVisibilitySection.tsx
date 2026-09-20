import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptVisibilitySection(props: ReceiptSettingsFormProps) {
  const { formData, handleChange, canEditSettings } = props;
  return (
    <div className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-2.5">
      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 block border-b border-neutral-200 dark:border-white/[0.08] pb-1.5">
        Print Visibility
      </label>
      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-hide">
        {[
          { name: 'receiptShowLogo', label: 'Store Logo' },
          { name: 'receiptShowTax', label: 'Tax Breakdown' },
          { name: 'receiptShowDiscount', label: 'Discount Details' },
          { name: 'receiptFontBold', label: 'High Contrast' },
          { name: 'receiptShowStoreName', label: 'Store Name' },
          { name: 'receiptShowStoreAddress', label: 'Store Address' },
          { name: 'receiptShowStorePhone', label: 'Store Phone' },
          { name: 'receiptShowStoreEmail', label: 'Store Email' },
          { name: 'receiptShowCustomerName', label: 'Customer Name' },
          { name: 'receiptShowCustomerPhone', label: 'Customer Phone' },
          { name: 'receiptShowNotes', label: 'Show Notes' },
          { name: 'receiptShowBarcode', label: 'Show Barcode' },
          { name: 'receiptShowDeliveryAddress', label: 'Delivery Address' },
          { name: 'receiptShowQrCode', label: 'QR Code' },
          { name: 'receiptShowFooter', label: 'Show Footer' },
        ].map((item) => (
          <label key={item.name} className="flex items-center gap-2 p-1.5 bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
            <input
              type="checkbox"
              name={item.name}
              checked={(formData as any)[item.name]}
              onChange={handleChange}
              disabled={!canEditSettings}
              className="rounded border-neutral-300 dark:border-white/20 text-emerald-600 h-3.5 w-3.5 bg-white dark:bg-surface"
            />
            <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 truncate">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
