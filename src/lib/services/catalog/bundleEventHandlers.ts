/**
 * Bundle P2P Remote Event Handlers
 * Receives BUNDLE_CREATED / BUNDLE_UPDATED / BUNDLE_DELETED events from peer devices
 * and applies them atomically to local SQLite.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { TABLES } from '../../db';
import { useAppStore } from '../../../stores';

export async function handleRemoteBundleEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const bundleId = event.entity_id || p.id;
  const eventType = (p?._meta?.eventType || p?.eventType || event.event_type || '').toUpperCase();

  // Handle DELETE / soft-delete
  if (
    event.operation === 'DELETE' ||
    eventType === 'BUNDLE_DELETED' ||
    p.active === false
  ) {
    await tx.execute(
      `UPDATE ${TABLES.BUNDLES} SET active = 0, updated_at = ? WHERE id = ?;`,
      [now, bundleId]
    );
    await tx.execute(
      `INSERT OR REPLACE INTO ${TABLES.TOMBSTONES} (entity_type, entity_id, deleted_at, deleted_by)
       VALUES ('BUNDLE', ?, ?, ?);`,
      [bundleId, p.deletedAt || now, event.device_id || 'remote']
    );
    // 0ms store sync
    try {
      useAppStore.getState().deleteBundle?.(bundleId);
    } catch {}
    return;
  }

  // CREATE or UPDATE
  await tx.execute(
    `INSERT OR REPLACE INTO ${TABLES.BUNDLES} (
      id, name, description, discount_value, discount_type,
      override_price, hide_item_prices, active, image, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      bundleId,
      p.name || '',
      p.description || '',
      Number(p.discountValue) || 0,
      p.discountType || 'percentage',
      p.overridePrice ?? null,
      p.hideItemPrices ? 1 : 0,
      p.active !== false ? 1 : 0,
      p.image || null,
      p.createdAt ? (typeof p.createdAt === 'number' ? p.createdAt : new Date(p.createdAt).getTime()) : now,
      now,
    ]
  );

  // Replace items
  if (Array.isArray(p.items)) {
    await tx.execute(`DELETE FROM ${TABLES.BUNDLE_ITEMS} WHERE bundle_id = ?;`, [bundleId]);
    for (const item of p.items) {
      await tx.execute(
        `INSERT OR IGNORE INTO ${TABLES.BUNDLE_ITEMS} (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?);`,
        [item.id || `bi_${bundleId}_${item.productId}`, bundleId, item.productId || item.product_id, Number(item.quantity) || 1]
      );
    }
  }

  // 0ms store sync — update Zustand immediately
  try {
    const itemsMapped = (p.items || []).map((bi: any) => ({
      id: bi.id || `bi_${bundleId}_${bi.productId}`,
      bundleId,
      productId: bi.productId || bi.product_id,
      quantity: Number(bi.quantity) || 1,
    }));

    const bundleRecord = {
      id: bundleId,
      name: p.name || '',
      description: p.description || '',
      discountValue: Number(p.discountValue) || 0,
      discountType: p.discountType || 'percentage',
      overridePrice: p.overridePrice ?? undefined,
      hideItemPrices: Boolean(p.hideItemPrices),
      active: p.active !== false,
      image: p.image ?? undefined,
      items: itemsMapped,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: new Date(now),
    };

    if (eventType === 'BUNDLE_CREATED') {
      useAppStore.getState().addBundle?.(bundleRecord);
    } else {
      useAppStore.getState().updateBundle?.(bundleRecord);
    }
  } catch {}
}

registerBundleEventHandlers();

export function registerBundleEventHandlers(): void {
  registerEventHandler('BUNDLE', handleRemoteBundleEvent);
  registerEventHandler('BUNDLE_CREATED', handleRemoteBundleEvent);
  registerEventHandler('BUNDLE_UPDATED', handleRemoteBundleEvent);
  registerEventHandler('BUNDLE_DELETED', handleRemoteBundleEvent);
}
