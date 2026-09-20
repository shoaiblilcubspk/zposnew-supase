import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptTextAreasSection(props: ReceiptSettingsFormProps) {
  const { formData, handleChange, canEditSettings } = props;
  return (
    <div className="p-3.5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] space-y-3">
      <div className="space-y-1">
        <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Header Welcome Text</label>
        <textarea
          name="receiptHeader"
          value={formData.receiptHeader}
          onChange={handleChange}
          disabled={!canEditSettings}
          className="w-full bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md py-1.5 px-2.5 transition-colors text-[13px] text-neutral-900 dark:text-white font-mono resize-none focus:outline-none focus:border-neutral-400"
          rows={2}
          placeholder="Welcome to our store..."
        />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">Footer / Terms Text</label>
        <textarea
          name="receiptFooter"
          value={formData.receiptFooter}
          onChange={handleChange}
          disabled={!canEditSettings}
          className="w-full bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] rounded-md py-1.5 px-2.5 transition-colors text-[13px] text-neutral-900 dark:text-white font-mono resize-none focus:outline-none focus:border-neutral-400"
          rows={2}
          placeholder="Thank you for shopping!"
        />
      </div>
    </div>
  );
}
