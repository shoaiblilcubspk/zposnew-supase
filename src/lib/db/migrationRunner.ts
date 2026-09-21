/**
 * SQLite Migration Runner
 * Executes pending DDL migrations transactionally and tracks applied versions.
 */

import { ISqliteDriver } from './types';
import { MIGRATION_001_VERSION, MIGRATION_001_NAME, MIGRATION_001_STATEMENTS } from './migrations/001_initial_schema';
import { MIGRATION_002_VERSION, MIGRATION_002_NAME, MIGRATION_002_STATEMENTS } from './migrations/002_user_avatar_and_email';
import { MIGRATION_003_VERSION, MIGRATION_003_NAME, MIGRATION_003_STATEMENTS } from './migrations/003_user_require_pin_on_sale';
import { MIGRATION_004_VERSION, MIGRATION_004_NAME, MIGRATION_004_STATEMENTS } from './migrations/004_product_enhancements_and_expiry';
import { MIGRATION_005_VERSION, MIGRATION_005_NAME, MIGRATION_005_STATEMENTS } from './migrations/005_salesman_and_customer_denorm';
import { MIGRATION_006_VERSION, MIGRATION_006_NAME, MIGRATION_006_STATEMENTS } from './migrations/006_discounts_sqlite';
import { MIGRATION_007_VERSION, MIGRATION_007_NAME, MIGRATION_007_STATEMENTS } from './migrations/007_deduplicate_customers';
import { MIGRATION_008_VERSION, MIGRATION_008_NAME, MIGRATION_008_STATEMENTS } from './migrations/008_bundles_sqlite';

export interface MigrationDefinition {
  version: number;
  name: string;
  statements: string[];
}

export const ALL_MIGRATIONS: MigrationDefinition[] = [
  {
    version: MIGRATION_001_VERSION,
    name: MIGRATION_001_NAME,
    statements: MIGRATION_001_STATEMENTS,
  },
  {
    version: MIGRATION_002_VERSION,
    name: MIGRATION_002_NAME,
    statements: MIGRATION_002_STATEMENTS,
  },
  {
    version: MIGRATION_003_VERSION,
    name: MIGRATION_003_NAME,
    statements: MIGRATION_003_STATEMENTS,
  },
  {
    version: MIGRATION_004_VERSION,
    name: MIGRATION_004_NAME,
    statements: MIGRATION_004_STATEMENTS,
  },
  {
    version: MIGRATION_005_VERSION,
    name: MIGRATION_005_NAME,
    statements: MIGRATION_005_STATEMENTS,
  },
  {
    version: MIGRATION_006_VERSION,
    name: MIGRATION_006_NAME,
    statements: MIGRATION_006_STATEMENTS,
  },
  {
    version: MIGRATION_007_VERSION,
    name: MIGRATION_007_NAME,
    statements: MIGRATION_007_STATEMENTS,
  },
  {
    version: MIGRATION_008_VERSION,
    name: MIGRATION_008_NAME,
    statements: MIGRATION_008_STATEMENTS,
  },
];

export async function runMigrations(driver: ISqliteDriver): Promise<number> {
  // 1. Ensure migrations metadata table exists
  await driver.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    );
  `);

  // 2. Fetch applied versions
  const appliedRows = await driver.query<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  // 3. Find pending migrations
  const pending = ALL_MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).sort(
    (a, b) => a.version - b.version
  );

  if (pending.length === 0) {
    const maxVersion = appliedRows.length > 0 ? Math.max(...appliedRows.map((r) => r.version)) : 0;
    return maxVersion;
  }

  // 4. Execute pending migrations
  for (const migration of pending) {
    const mStart = Date.now();
    await driver.transaction(async (tx) => {
      for (const statement of migration.statements) {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          try {
            await tx.execute(trimmed);
          } catch (err: any) {
            const errMsg = typeof err === 'string' ? err : (err?.message || String(err || ''));
            if (/duplicate column name|already exists/i.test(errMsg)) {
              continue;
            }
            throw err;
          }
        }
      }

      const durationMs = Date.now() - mStart;
      await tx.execute(
        'INSERT INTO _migrations (version, name, applied_at, duration_ms) VALUES (?, ?, ?, ?);',
        [migration.version, migration.name, Date.now(), durationMs]
      );
    });
  }

  const finalRows = await driver.query<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version DESC LIMIT 1;'
  );
  const currentVersion = finalRows.length > 0 ? finalRows[0].version : 0;
  return currentVersion;
}

export async function getCurrentSchemaVersion(driver: ISqliteDriver): Promise<number> {
  try {
    const rows = await driver.query<{ version: number }>(
      'SELECT version FROM _migrations ORDER BY version DESC LIMIT 1;'
    );
    return rows.length > 0 ? rows[0].version : 0;
  } catch {
    return 0;
  }
}
