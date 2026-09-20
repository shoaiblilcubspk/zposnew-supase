import { BackupRestoreTab } from './BackupRestoreTab';
import { ProductCatalogToolsCard } from './ProductCatalogToolsCard';
import { LocalBackupCard } from './LocalBackupCard';
import { CloudBackupCard } from './CloudBackupCard';
import { LedgerHealth } from './LedgerHealth';

export function SystemSettings() {
  return (
    <section className="space-y-6">
      <BackupRestoreTab />
      <ProductCatalogToolsCard />
      <LocalBackupCard />
      <CloudBackupCard />
      <LedgerHealth />
    </section>
  );
}
