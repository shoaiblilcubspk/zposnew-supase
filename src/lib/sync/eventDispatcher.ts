/**
 * Event Dispatcher for Remote Mutations
 * Routes incoming P2P sync events to local entity handlers inside an atomic SQLite transaction.
 */

import { ISqliteTransaction } from '../db/types';
import { SyncOutboxRecord } from '../events/types';

export type RemoteEventHandler = (
  event: SyncOutboxRecord,
  tx: ISqliteTransaction
) => Promise<void>;

class EventDispatcher {
  private handlers: Map<string, RemoteEventHandler> = new Map();

  registerHandler(entityType: string, handler: RemoteEventHandler): void {
    this.handlers.set(entityType.toUpperCase(), handler);
  }

  async dispatch(event: SyncOutboxRecord, tx: ISqliteTransaction): Promise<void> {
    let payloadObj: any = null;
    try {
      payloadObj = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
    } catch {}

    const eventType = (payloadObj?._meta?.eventType || payloadObj?.eventType || '').toUpperCase();
    const compoundKey = `${event.entity_type}:${event.operation}`.toUpperCase();
    const entityKey = (event.entity_type || '').toUpperCase();

    // 1. Check specific business event type handler (e.g. SALE_VOIDED, SALE_REFUNDED)
    if (eventType && this.handlers.has(eventType)) {
      await this.handlers.get(eventType)!(event, tx);
      return;
    }

    // 2. Check compound entity + operation handler (e.g. SALE:DELETE)
    if (this.handlers.has(compoundKey)) {
      await this.handlers.get(compoundKey)!(event, tx);
      return;
    }

    // 3. Fallback to base entity type handler (e.g. SALE, PRODUCT)
    if (this.handlers.has(entityKey)) {
      await this.handlers.get(entityKey)!(event, tx);
      return;
    }

    // Default fallback: Log received entity mutation awaiting dedicated domain service
    console.info(
      `[EventDispatcher] Unhandled remote event ${event.event_id} for entity ${event.entity_type} (${event.operation})`
    );
  }
}

export const eventDispatcher = new EventDispatcher();

export function registerEventHandler(
  entityType: string,
  handler: RemoteEventHandler
): void {
  eventDispatcher.registerHandler(entityType, handler);
}
