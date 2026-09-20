import { getDatabase, TABLES } from '../db';
import { commitLocalTransaction } from '../events';

/** Soft-delete bundle: set active=0 + tombstone + P2P outbox */
export async function deleteBundle(bundleId: string): Promise<void> {
  const now = Date.now();
  const db = await getDatabase();

  await db.transaction(async tx => {
    await tx.execute(
      `UPDATE ${TABLES.BUNDLES} SET active = 0, updated_at = ? WHERE id = ?;`,
      [now, bundleId]
    );
    // Tombstone for P2P sync awareness (peers will soft-delete too)
    await tx.execute(
      `INSERT OR REPLACE INTO ${TABLES.TOMBSTONES} (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('BUNDLE', ?, ?, 'local');`,
      [bundleId, now]
    );
  });

  await commitLocalTransaction({
    entityType: 'BUNDLE',
    entityId: bundleId,
    eventType: 'BUNDLE_DELETED',
    payload: { id: bundleId, active: false, deletedAt: now },
  });
}
