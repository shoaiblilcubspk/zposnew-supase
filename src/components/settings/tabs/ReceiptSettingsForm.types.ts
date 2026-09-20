import type { SettingsTabProps } from './types';

export interface ReceiptSettingsFormProps {
  formData: SettingsTabProps['formData'];
  setFormData: SettingsTabProps['setFormData'];
  setFormDataDirect: SettingsTabProps['setFormDataDirect'];
  handleChange: SettingsTabProps['handleChange'];
  handleInstantUpdate: SettingsTabProps['handleInstantUpdate'];
  handleResetCalibration: SettingsTabProps['handleResetCalibration'];
  handleRepairCounter?: SettingsTabProps['handleRepairCounter'];
  canEditSettings: boolean;
}
