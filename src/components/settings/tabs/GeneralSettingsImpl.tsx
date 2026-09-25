import { Sliders } from 'lucide-react';
import { GeneralModules } from './GeneralModules';
import { GeneralStoreIdentity, GeneralLocalization } from './generalCards';
import { IntegrationsCard } from './IntegrationsCard';
import type { SettingsTabProps } from './types';

export function GeneralSettings(props: SettingsTabProps) {
  const { formData, setFormData, setFormDataDirect, handleChange, handleInstantUpdate } = props;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        <div className="lg:col-span-8 space-y-6">
          <GeneralStoreIdentity
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            handleInstantUpdate={handleInstantUpdate}
          />

          <GeneralLocalization
            formData={formData}
            setFormData={setFormData}
            setFormDataDirect={setFormDataDirect}
            handleChange={handleChange}
            handleInstantUpdate={handleInstantUpdate}
          />

          <IntegrationsCard />
        </div>

        <GeneralModules {...props} />
      </div>
    </section>
  );
}
