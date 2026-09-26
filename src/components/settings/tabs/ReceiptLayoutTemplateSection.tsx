import { Printer, LayoutGrid } from 'lucide-react';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptLayoutTemplateSection(props: ReceiptSettingsFormProps) {
  const { formData, setFormDataDirect, handleInstantUpdate, canEditSettings } = props;
  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
      <div className="space-y-1 relative z-30">
        <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Paper Size</label>
        <SearchableSelect
          options={[
            { id: '80mm', label: 'Thermal 80mm (Standard)' },
            { id: '58mm', label: 'Thermal 58mm (Compact)' },
            { id: 'A4', label: 'Office A4 Sheet' }
          ]}
          value={formData.receiptPaperSize}
          onChange={(val) => {
            setFormDataDirect(p => ({ ...p, receiptPaperSize: val }));
            handleInstantUpdate('receiptPaperSize', val);
          }}
          placeholder="Select paper size..."
          icon={Printer}
        />
      </div>

      <div className="space-y-1 relative z-30">
        <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">Visual Template</label>
        <SearchableSelect
          options={[
            { id: 'modern', label: 'Modern Clean' },
            { id: 'minimal', label: 'Minimalist' },
            { id: 'professional', label: 'Enterprise Pro' },
            { id: 'compact', label: 'Ultra Compact' },
            { id: 'classic', label: 'Legacy System' },
            { id: 'horizontal_header', label: 'Horizontal Header' },
            { id: 'centered_flow', label: 'Centered Flow' },
            { id: 'left_grid', label: 'Left-Aligned Grid' },
            { id: 'split_columns', label: 'Split Columns' },
            { id: 'floating_totals', label: 'Floating Totals' },
            { id: 'offset_logo', label: 'Offset Logo' },
            { id: 'boxed_sections', label: 'Boxed Sections' },
            { id: 'tear_off', label: 'Tear-Off Slip' },
            { id: 'vertical_line', label: 'Vertical Line Header' },
            { id: 'emphasized_total', label: 'Emphasized Total' }
          ]}
          value={formData.receiptTemplate}
          onChange={(val) => {
            setFormDataDirect(p => ({ ...p, receiptTemplate: val }));
            handleInstantUpdate('receiptTemplate', val);
          }}
          placeholder="Select template..."
          icon={LayoutGrid}
        />
      </div>

      <div className="space-y-1.5 p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] rounded border border-neutral-200 dark:border-white/[0.08]">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 flex justify-between">
          Global Font Weight
          <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptFontWeight || 600}</span>
        </label>
        <input
          type="range"
          min="100"
          max="900"
          step="100"
          name="receiptFontWeight"
          value={formData.receiptFontWeight || 600}
          onChange={(e) => setFormDataDirect(p => ({ ...p, receiptFontWeight: parseInt(e.target.value) }))}
          onMouseUp={(e: any) => handleInstantUpdate('receiptFontWeight', parseInt(e.target.value))}
          onTouchEnd={(e: any) => handleInstantUpdate('receiptFontWeight', parseInt(e.target.value))}
          disabled={!canEditSettings}
          className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary my-1"
        />
      </div>

      <div className="space-y-1.5 p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] rounded border border-neutral-200 dark:border-white/[0.08]">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 flex justify-between">
          Zoom Scale
          <span className="font-mono tabular-nums text-neutral-900 dark:text-white font-semibold">{formData.receiptFontScale}x</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          name="receiptFontScale"
          value={formData.receiptFontScale}
          onChange={(e) => setFormDataDirect(p => ({ ...p, receiptFontScale: parseFloat(e.target.value) }))}
          onMouseUp={(e: any) => handleInstantUpdate('receiptFontScale', parseFloat(e.target.value))}
          onTouchEnd={(e: any) => handleInstantUpdate('receiptFontScale', parseFloat(e.target.value))}
          disabled={!canEditSettings}
          className="w-full h-1.5 bg-neutral-200 dark:bg-white/10 rounded appearance-none cursor-pointer accent-primary my-1"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-white">Auto Print</span>
          <input
            type="checkbox"
            name="receiptPrinter"
            checked={!!formData.receiptPrinter}
            onChange={(e) => {
              const val = e.target.checked;
              setFormDataDirect(p => ({ ...p, receiptPrinter: val }));
              handleInstantUpdate('receiptPrinter', val);
            }}
            className="w-4 h-4 rounded text-primary focus:ring-primary"
          />
        </label>

        <label className="flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-white">Enable KOT</span>
          <input
            type="checkbox"
            name="enableKotPrinter"
            checked={!!formData.enableKotPrinter}
            onChange={(e) => {
              const val = e.target.checked;
              setFormDataDirect(p => ({ ...p, enableKotPrinter: val }));
              handleInstantUpdate('enableKotPrinter', val);
            }}
            className="w-4 h-4 rounded text-primary focus:ring-primary"
          />
        </label>

        <label className="col-span-1 sm:col-span-2 flex items-center justify-between p-2.5 bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.08] rounded cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.04]">
          <div>
            <span className="text-[13px] font-medium text-neutral-900 dark:text-white block">Auto-Save Receipt PNG</span>
            <p className="text-[11px] text-neutral-500 font-mono">Saves PNG to device, organized by date</p>
          </div>
          <input
            type="checkbox"
            name="autoSaveReceiptPng"
            checked={!!formData.autoSaveReceiptPng}
            onChange={(e) => {
              const val = e.target.checked;
              setFormDataDirect(p => ({ ...p, autoSaveReceiptPng: val }));
              handleInstantUpdate('autoSaveReceiptPng', val);
            }}
            className="w-4 h-4 rounded text-primary focus:ring-primary"
          />
        </label>
      </div>
    </div>
  );
}
