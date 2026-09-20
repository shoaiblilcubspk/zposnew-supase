/**
 * Migration 008: Bundles & Bundle Items SQLite Tables
 * Moves bundles from Dexie (browser-only IndexedDB) to authoritative local SQLite
 * so they are included in P2P sync, snapshots, outbox events, and backups.
 * Existing Dexie bundles are migrated on app load by bundleGetAll.ts fallback.
 */

export const MIGRATION_008_VERSION = 8;
export const MIGRATION_008_NAME = 'bundles_sqlite';

export const MIGRATION_008_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS bundles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    discount_value REAL NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    override_price REAL,
    hide_item_prices INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    image TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS bundle_items (
    id TEXT PRIMARY KEY,
    bundle_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE
  );`,

  `CREATE INDEX IF NOT EXISTS idx_bundles_active ON bundles(active);`,
  `CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);`,
];
