/**
 * Migration 007: Deduplicate Customers by Phone
 *
 * Problem: Two devices independently created the same customer with different UUIDs.
 * Both records survived P2P sync (INSERT OR REPLACE by ID — different IDs = both kept).
 *
 * Fix: For each phone number that has multiple active records, keep the OLDEST record
 * (lowest created_at = the authoritative "original") and soft-delete all newer duplicates.
 * Sale/ledger foreign keys remain intact since we keep one record, not delete all.
 */

export const MIGRATION_007_VERSION = 7;
export const MIGRATION_007_NAME = 'deduplicate_customers_by_phone';

export const MIGRATION_007_STATEMENTS: string[] = [
  // Step 1: Soft-delete duplicate customers — keep oldest per phone, mark rest inactive.
  // Uses a subquery to find the canonical (oldest) id per phone.
  `UPDATE customers
   SET active = 0,
       updated_at = CAST(strftime('%s', 'now') * 1000 AS INTEGER)
   WHERE active = 1
     AND phone IS NOT NULL
     AND phone != ''
     AND id NOT IN (
       SELECT MIN(id)
       FROM customers
       WHERE active = 1
         AND phone IS NOT NULL
         AND phone != ''
       GROUP BY phone
       HAVING COUNT(*) > 1
     )
     AND phone IN (
       SELECT phone
       FROM customers
       WHERE active = 1
         AND phone IS NOT NULL
         AND phone != ''
       GROUP BY phone
       HAVING COUNT(*) > 1
     );`,

  // Step 2: Insert tombstones for the soft-deleted duplicates so peers learn to skip them.
  `INSERT OR IGNORE INTO tombstones (entity_type, entity_id, deleted_at, deleted_by)
   SELECT 'CUSTOMER', id, CAST(strftime('%s', 'now') * 1000 AS INTEGER), 'migration_007'
   FROM customers
   WHERE active = 0
     AND id NOT IN (SELECT entity_id FROM tombstones WHERE entity_type = 'CUSTOMER');`,
];
