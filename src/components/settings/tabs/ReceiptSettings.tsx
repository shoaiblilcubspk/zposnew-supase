import { Printer } from 'lucide-react';
import { ReceiptSettingsForm } from './ReceiptSettingsForm';
import { ReceiptSettingsPreview } from './ReceiptSettingsPreview';

export function ReceiptSettings({
  formData,
  setFormData,
  setFormDataDirect,
  handleChange,
  handleInstantUpdate,
  handleResetCalibration,
  handleRepairCounter,
  appSettings,
  profile,
  setCompletedSale,
  setShowReceipt,
  canEditSettings,
}: import('./types').SettingsTabProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-surface border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-600 dark:text-neutral-400">
          <Printer className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">Receipt Design</h2>
          <p className="text-[12px] text-neutral-500">Branding & Printing Orchestration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <ReceiptSettingsForm
          formData={formData}
          setFormData={setFormData}
          setFormDataDirect={setFormDataDirect}
          handleChange={handleChange}
          handleInstantUpdate={handleInstantUpdate}
          handleResetCalibration={handleResetCalibration}
          handleRepairCounter={handleRepairCounter}
          canEditSettings={canEditSettings}
        />
        <ReceiptSettingsPreview
          formData={formData}
          appSettings={appSettings}
          profile={profile}
          setCompletedSale={setCompletedSale}
          setShowReceipt={setShowReceipt}
        />
      </div>
    </section>
  );
}
