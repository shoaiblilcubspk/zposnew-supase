/**
 * Migration 006: Discounts SQLite Table
 * Moves discounts from Dexie (browser-only) to authoritative local SQLite
 * so they are included in P2P sync, snapshots, and outbox events.
 */

export const MIGRATION_006_VERSION = 6;
export const MIGRATION_006_NAME = 'discounts_sqlite';

export const MIGRATION_006_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS discounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL DEFAULT 0,
    conditions TEXT DEFAULT '[]',
    min_amount REAL,
    max_discount REAL,
    valid_from INTEGER NOT NULL,
    valid_to INTEGER NOT NULL,
    valid_days TEXT DEFAULT NULL,
    active INTEGER DEFAULT 1,
    is_auto_apply INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(active);`,
];
