import { LocalPinChangeSection } from './LocalPinChangeSection';
import { RecoveryCodeResetSection } from './RecoveryCodeResetSection';

export function SecuritySettings() {
  return (
    <section className="space-y-6">
      <LocalPinChangeSection />
      <RecoveryCodeResetSection />
    </section>
  );
}

