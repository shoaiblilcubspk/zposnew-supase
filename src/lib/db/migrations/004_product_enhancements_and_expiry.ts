/**
 * Migration 004: Product Enhancements & Expiry Tracking Schema
 * Adds columns to products for variable products, service items, serial/IMEI, add-ons, and expiry tracking.
 * Adds can_view_expiry column to users table for permission control.
 */

export const MIGRATION_004_VERSION = 4;
export const MIGRATION_004_NAME = 'product_enhancements_and_expiry';

export const MIGRATION_004_STATEMENTS = [
  // Product universal enhancements & expiry
  `ALTER TABLE products ADD COLUMN is_service INTEGER DEFAULT 0;`,
  `ALTER TABLE products ADD COLUMN require_serial INTEGER DEFAULT 0;`,
  `ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'simple';`,
  `ALTER TABLE products ADD COLUMN variants_json TEXT;`,
  `ALTER TABLE products ADD COLUMN variant_data_json TEXT;`,
  `ALTER TABLE products ADD COLUMN product_addons_json TEXT;`,
  `ALTER TABLE products ADD COLUMN expiry_date TEXT;`,
  `ALTER TABLE products ADD COLUMN expiry_alert_days INTEGER DEFAULT 90;`,

  // User permission for expiry visibility
  `ALTER TABLE users ADD COLUMN can_view_expiry INTEGER DEFAULT 1;`,
];
