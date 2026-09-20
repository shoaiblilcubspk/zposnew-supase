import { ReceiptLayoutTemplateSection } from './ReceiptLayoutTemplateSection';
import { ReceiptInvoicingSection } from './ReceiptInvoicingSection';
import { ReceiptTextAreasSection } from './ReceiptTextAreasSection';
import { ReceiptMarginCalibrationSection } from './ReceiptMarginCalibrationSection';
import { ReceiptVisibilitySection } from './ReceiptVisibilitySection';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptSettingsForm(props: ReceiptSettingsFormProps) {
  return (
    <>
      <div className="lg:col-span-5 space-y-6">
        <ReceiptLayoutTemplateSection {...props} />
        <ReceiptInvoicingSection {...props} />
        <ReceiptTextAreasSection {...props} />
      </div>
      <div className="lg:col-span-4 space-y-6">
        <ReceiptMarginCalibrationSection {...props} />
        <ReceiptVisibilitySection {...props} />
      </div>
    </>
  );
}
