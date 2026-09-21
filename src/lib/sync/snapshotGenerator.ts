/**
 * P2P Store Snapshot Generator
 * Extracts a complete consistent snapshot from local SQLite.
 */

import { getDatabase, TABLES } from '../db';
import { ExtendedSnapshotEntities } from './snapshotApplier';

export interface MeshStoreSnapshot extends ExtendedSnapshotEntities {
  shop?: any;
  categories: any[];
  products: any[];
  inventoryTransactions: any[];
  sales: any[];
  saleItems: any[];
  payments: any[];
  expenses: any[];
  customerLedger: any[];
  purchaseRecords: any[];
  users: any[];
  settings: any[];
  discounts: any[];
  bundles: any[];
  bundleItems: any[];
  customers: any[];
  suppliers: any[];
  paymentModes: any[];
  devices: any[];
  timestamp: number;
}

export async function generateSnapshot(): Promise<MeshStoreSnapshot> {
  const db = await getDatabase();

  const [
    shop,
    categories,
    products,
    inventoryTransactions,
    sales,
    saleItems,
    payments,
    expenses,
    customerLedger,
    purchaseRecords,
    users,
    settings,
    discounts,
    bundles,
    bundleItems,
    customers,
    suppliers,
    paymentModes,
    devices,
  ] = await Promise.all([
    db.queryOne(`SELECT * FROM ${TABLES.SHOP} LIMIT 1;`).catch(() => null),
    db.query(`SELECT * FROM ${TABLES.CATEGORIES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PRODUCTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.INVENTORY_TRANSACTIONS} ORDER BY created_at ASC;`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SALES} ORDER BY timestamp ASC;`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SALE_ITEMS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PAYMENTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.EXPENSES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.CUSTOMER_LEDGER};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PURCHASE_RECORDS};`).catch(() => []),
    db.query(`SELECT id, name, username, pin_hash, role, email, avatar, active, created_at, updated_at FROM ${TABLES.USERS};`).catch(() => []),
    db.query(`SELECT key, value, updated_at FROM ${TABLES.SETTINGS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.DISCOUNTS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.BUNDLES};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.BUNDLE_ITEMS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.CUSTOMERS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.SUPPLIERS};`).catch(() => []),
    db.query(`SELECT * FROM ${TABLES.PAYMENT_MODES};`).catch(() => []),
    db.query(`SELECT device_id, name, role, public_key, is_revoked, paired_at FROM ${TABLES.DEVICES};`).catch(() => []),
  ]);

  return {
    shop,
    categories,
    products,
    inventoryTransactions,
    sales,
    saleItems,
    payments,
    expenses,
    customerLedger,
    purchaseRecords,
    users,
    settings,
    discounts,
    bundles,
    bundleItems,
    customers,
    suppliers,
    paymentModes,
    devices,
    timestamp: Date.now(),
  };
}
