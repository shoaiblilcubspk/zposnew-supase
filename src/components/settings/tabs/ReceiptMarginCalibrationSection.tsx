import { Button } from '../../../shared/ui';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptMarginCalibrationSection(props: ReceiptSettingsFormProps) {
  const { formData, setFormData, handleChange, handleResetCalibration, canEditSettings } = props;
  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/[0.08] pb-2.5">
        <label className="text-[13px] font-semibold text-neutral-900 dark:text-white">
          Hardware Calibration (mm)
        </label>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={handleResetCalibration}
          className="h-7 px-2 text-[12px] font-medium"
        >
          Reset
        </Button>
      </div>

      <div className="space-y-2.5">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Margin Top</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptPaddingTop ?? 0}mm</span>
          </div>
          <input type="range" min="-60" max="60" step="1"
            value={formData.receiptPaddingTop ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingTop: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Margin Bottom</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptPaddingBottom ?? 0}mm</span>
          </div>
          <input type="range" min="-60" max="60" step="1"
            value={formData.receiptPaddingBottom ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingBottom: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Margin Left</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptPaddingLeft ?? 0}mm</span>
          </div>
          <input type="range" min="-45" max="45" step="1"
            value={formData.receiptPaddingLeft ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingLeft: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Margin Right</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptPaddingRight ?? 0}mm</span>
          </div>
          <input type="range" min="-45" max="45" step="1"
            value={formData.receiptPaddingRight ?? 0}
            onChange={(e) => setFormData(p => ({ ...p, receiptPaddingRight: parseInt(e.target.value) }))}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Global Shift (Everything)</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-40" max="40" step="1"
            name="receiptOffsetX"
            value={formData.receiptOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Header Indent</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptHeaderOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-30" max="30" step="1"
            name="receiptHeaderOffsetX"
            value={formData.receiptHeaderOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptHeaderOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
          <div className="flex justify-between items-center text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <span>Footer Indent</span>
            <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptFooterOffsetX ?? 0}mm</span>
          </div>
          <input type="range" min="-30" max="30" step="1"
            name="receiptFooterOffsetX"
            value={formData.receiptFooterOffsetX ?? 0}
            onChange={(e) => handleChange({ target: { name: 'receiptFooterOffsetX', value: parseInt(e.target.value) } } as any)}
            disabled={!canEditSettings}
            className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
