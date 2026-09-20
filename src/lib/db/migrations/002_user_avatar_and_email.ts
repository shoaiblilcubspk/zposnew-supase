/**
 * Migration 002: Add avatar and email columns to users table
 * Ensures user profiles and avatars persist permanently in local SQLite.
 */

export const MIGRATION_002_VERSION = 2;
export const MIGRATION_002_NAME = 'user_avatar_and_email';

export const MIGRATION_002_STATEMENTS = [
  // Add avatar column if not exists
  `ALTER TABLE users ADD COLUMN avatar TEXT;`,
  // Add email column if not exists
  `ALTER TABLE users ADD COLUMN email TEXT;`,
];
