/**
 * Inventory P2P Replication Event Handlers
 * Receives remote stock movements from peer terminals and applies deltas atomically.
 */

import { ISqliteTransaction } from '../../db/types';
import { SyncOutboxRecord } from '../../events/types';
import { registerEventHandler } from '../../sync/eventDispatcher';
import { insertInventoryTransaction } from './inventoryLedgerRepository';
import { localDb } from '../../localDb';

export async function handleRemoteInventoryEvent(
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
): Promise<void> {
  const p = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const now = Date.now();
  const delta = Number(p.quantity) || 0;
  const productId = event.entity_id || p.productId;

  // 1. Fetch current stock
  const currentProd = await tx.queryOne<{ stock: number }>(
    `SELECT stock FROM products WHERE id = ?;`,
    [productId]
  );
  const currentStock = currentProd ? Number(currentProd.stock) : 0;
  let newBalance = currentStock + delta;

  // 2. Insert append-only transaction entry with deterministic ID
  const itxStockId = `itx_stock_${p.id || p.referenceId || event.event_id}`;
  await insertInventoryTransaction(
    {
      id: itxStockId,
      productId,
      variantId: p.variantId,
      type: p.type || (delta >= 0 ? 'INVENTORY_IN' : 'INVENTORY_OUT'),
      quantity: delta,
      balanceAfter: 0,
      referenceType: p.referenceType || 'PURCHASE',
      referenceId: p.referenceId || event.event_id,
      deviceId: event.device_id,
      userId: event.device_id,
      notes: p.notes,
      createdAt: event.created_at || now,
    },
    tx
  );

  // 3. Authoritatively recompute stock from ledger sum
  await tx.execute(
    `UPDATE products
     SET stock = (
       SELECT COALESCE(SUM(quantity), 0)
       FROM inventory_transactions
       WHERE product_id = ?
     ),
     updated_at = ?
     WHERE id = ?;`,
    [productId, now, productId]
  );

  const updatedProd = await tx.queryOne<{ stock: number }>(`SELECT stock FROM products WHERE id = ?;`, [productId]);
  newBalance = updatedProd ? Number(updatedProd.stock) : newBalance;

  // Sync Dexie local cache
  try {
    await localDb.products.update(productId, {
      stock: newBalance,
      updatedAt: new Date(now),
    });
  } catch {}
}

export function registerInventoryEventHandlers(): void {
  registerEventHandler('INVENTORY', handleRemoteInventoryEvent);
  registerEventHandler('INVENTORY_IN', handleRemoteInventoryEvent);
  registerEventHandler('INVENTORY_OUT', handleRemoteInventoryEvent);
  registerEventHandler('INVENTORY_AUDIT', handleRemoteInventoryEvent);
}
