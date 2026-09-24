import { softDeleteRow } from '../../data';

/** Soft-delete bundle: set active=0 via the write-through queue. */
export async function deleteBundle(bundleId: string): Promise<void> {
  await softDeleteRow('bundles', bundleId, 'active');
}
