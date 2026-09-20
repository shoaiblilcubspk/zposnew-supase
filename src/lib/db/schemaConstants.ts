/**
 * Database Table and Entity Name Constants
 * Single source of truth for SQLite table names across the system.
 */

export const TABLES = {
  SHOP: 'shop',
  DEVICES: 'devices',
  USERS: 'users',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCT_VARIANTS: 'product_variants',
  PRODUCT_IMAGES: 'product_images',
  BUNDLES: 'bundles',
  BUNDLE_ITEMS: 'bundle_items',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  PAYMENTS: 'payments',
  PAYMENT_MODES: 'payment_modes',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  CUSTOMERS: 'customers',
  CUSTOMER_LEDGER: 'customer_ledger',
  SUPPLIERS: 'suppliers',
  PURCHASE_RECORDS: 'purchase_records',
  EXPENSES: 'expenses',
  DISCOUNTS: 'discounts',
  SYNC_OUTBOX: 'sync_outbox',
  SYNC_INBOX: 'sync_inbox',
  TOMBSTONES: 'tombstones',
  SETTINGS: 'settings',
  MIGRATIONS: '_migrations',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
