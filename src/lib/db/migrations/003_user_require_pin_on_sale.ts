/**
 * Migration 003: Add require_pin_on_sale column to users table
 * Allows configuring per-user PIN requirement on POS sale finalization.
 */

export const MIGRATION_003_VERSION = 3;
export const MIGRATION_003_NAME = 'user_require_pin_on_sale';

export const MIGRATION_003_STATEMENTS = [
  `ALTER TABLE users ADD COLUMN require_pin_on_sale INTEGER DEFAULT 0;`,
];
