/**
 * Event Sourcing and Sync Outbox Types
 * Authoritative types for append-only distributed mutations and outbox records.
 */

import { ISqliteTransaction } from '../db/types';

export type EntityType =
  | 'PRODUCT'
  | 'PRODUCT_VARIANT'
  | 'CATEGORY'
  | 'SALE'
  | 'INVENTORY'
  | 'CUSTOMER'
  | 'CUSTOMER_LEDGER'
  | 'SUPPLIER'
  | 'PURCHASE_RECORD'
  | 'EXPENSE'
  | 'PAYMENT_MODE'
  | 'USER'
  | 'SETTINGS';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export type BusinessEventType =
  | 'SALE_CREATED'
  | 'SALE_REFUNDED'
  | 'SALE_VOIDED'
  | 'INVENTORY_IN'
  | 'INVENTORY_OUT'
  | 'INVENTORY_AUDIT'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED'
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_CREATED'
  | 'SUPPLIER_UPDATED'
  | 'PURCHASE_CREATED'
  | 'EXPENSE_CREATED'
  | 'EXPENSE_DELETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'SETTINGS_UPDATED';

export interface SyncOutboxRecord {
  event_id: string;
  device_id: string;
  sequence: number;
  entity_type: EntityType | string;
  entity_id: string;
  operation: OperationType;
  payload: string; // JSON encoded string
  created_at: number;
  is_synced: number; // 0 = pending, 1 = acknowledged by peers
}

export interface SyncInboxRecord {
  event_id: string;
  sender_device_id: string;
  sequence: number;
  applied_at: number;
}

export interface LocalTransactionOptions<T = any> {
  entityType: EntityType | string;
  entityId: string;
  operation: OperationType;
  payload: Record<string, any>;
  userId: string;
  deviceId: string;
  eventType?: BusinessEventType | string;
  execute: (tx: ISqliteTransaction) => Promise<T>;
}

export interface OutboxStats {
  totalEvents: number;
  pendingEvents: number;
  syncedEvents: number;
  lastSequence: number;
}
