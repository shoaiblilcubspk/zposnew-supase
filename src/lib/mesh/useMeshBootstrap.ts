/**
 * Mesh & Sync Lifecycle Bootstrap Hook
 * Connects signaling, initializes WebRTC P2P DataChannels, and starts the Event Sync Engine.
 */

import { useEffect } from 'react';
import { getDeviceProfile } from './deviceIdentity';
import { getSignalingChannel } from './signalingChannel';
import { getP2PMesh } from './p2pMesh';
import { getSyncEngine } from '../sync/syncEngine';
import { registerCatalogEventHandlers } from '../services/catalog/catalogEventHandlers';
import { registerInventoryEventHandlers } from '../services/inventory/inventoryEventHandlers';
import { registerSalesEventHandlers } from '../services/sales/salesEventHandlers';
import { registerSaleEditEventHandlers } from '../services/sales/saleEditEventHandlers';
import { registerReversalEventHandlers } from '../services/sales/reversalEventHandlers';
import { registerCustomerEventHandlers } from '../services/customers/customerEventHandlers';
import { registerSupplierEventHandlers } from '../services/suppliers/supplierEventHandlers';
import { registerExpenseEventHandlers } from '../services/expenses/expenseEventHandlers';
import { registerUserEventHandlers } from '../services/users/userEventHandlers';
import { registerSettingsEventHandlers } from '../services/settings/settingsEventHandlers';
import { registerDiscountEventHandlers } from '../services/discounts/discountEventHandlers';
import { registerBundleEventHandlers } from '../services/catalog/bundleEventHandlers';
import { initP2PImageSync } from '../media/p2pImageTransfer';

export function useMeshBootstrap(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    registerCatalogEventHandlers();
    registerInventoryEventHandlers();
    registerSalesEventHandlers();
    registerSaleEditEventHandlers();
    registerReversalEventHandlers();
    registerCustomerEventHandlers();
    registerSupplierEventHandlers();
    registerExpenseEventHandlers();
    registerUserEventHandlers();
    registerSettingsEventHandlers();
    registerDiscountEventHandlers();
    registerBundleEventHandlers();
    initP2PImageSync();
    let isCancelled = false;

    async function initMesh() {
      try {
        const profile = await getDeviceProfile();
        if (isCancelled) return;
        if (!profile || !profile.shopId) return;

        // 1. Start Outbox/Inbox Sync Engine FIRST so it listens before peers arrive
        const sync = getSyncEngine();
        await sync.start();

        // 2. Start WebRTC P2P Mesh Manager
        const mesh = getP2PMesh();
        await mesh.start();

        // 3. Join Signaling room
        const signaling = getSignalingChannel();
        await signaling.connect(profile.shopId);
      } catch (err) {
        console.warn('[MeshBootstrap] Running in autonomous offline mode:', err);
      }
    }

    initMesh();

    return () => {
      isCancelled = true;
      try {
        getSyncEngine().stop();
        getP2PMesh().stop();
        getSignalingChannel().disconnect();
      } catch {}
    };
  }, [enabled]);
}
