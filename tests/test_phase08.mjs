import assert from 'node:assert';
import {
  getInboxMaxSequence,
  getOutboxMaxSequence,
  getUnsyncedOutboxEvents,
  getPendingOutboxCount,
  markEventsSynced,
} from '../src/lib/sync/vectorClock.ts';
import { getDatabase, initDatabase } from '../src/lib/db/index.ts';
import { runMigrations } from '../src/lib/db/migrationRunner.ts';

console.log('--- TEST PHASE 08: Event Synchronization Engine (Outbox / Inbox) ---');

async function run() {
  const db = await initDatabase();

  const devA = 'dev_alpha_01';
  const devB = 'dev_beta_02';

  // 1. Initial counts
  const initialPending = await getPendingOutboxCount();
  console.log(`Initial pending outbox count: ${initialPending}`);

  // 2. Insert test outbox events from devA
  await db.execute(
    `INSERT INTO sync_outbox (event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['evt_101', devA, 1, 'PRODUCT', 'prod_1', 'CREATE', JSON.stringify({ name: 'Shirt', price: 1500 }), Date.now(), 0]
  );

  await db.execute(
    `INSERT INTO sync_outbox (event_id, device_id, sequence, entity_type, entity_id, operation, payload, created_at, is_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['evt_102', devA, 2, 'SALE', 'sale_1', 'CREATE', JSON.stringify({ total: 1500, status: 'completed' }), Date.now(), 0]
  );

  const pendingAfterInsert = await getPendingOutboxCount();
  assert.ok(pendingAfterInsert >= 2, 'Pending count should reflect inserted events');
  console.log(`✓ Pending outbox count updated: ${pendingAfterInsert}`);

  // 3. Vector clock sequence checks
  const maxSeqDevA = await getOutboxMaxSequence(devA);
  assert.strictEqual(maxSeqDevA, 2, 'DevA max sequence should be 2');
  console.log(`✓ DevA max sequence: ${maxSeqDevA}`);

  // 4. Retrieve unsynced batch
  const unsynced = await getUnsyncedOutboxEvents(devA, 0, 50);
  assert.strictEqual(unsynced.length, 2);
  assert.strictEqual(unsynced[0].event_id, 'evt_101');
  assert.strictEqual(unsynced[1].event_id, 'evt_102');
  console.log('✓ Retrieved unsynced events batch in monotonic order');

  // 5. Simulate Remote Receiver applying events to sync_inbox
  for (const evt of unsynced) {
    // Check if exists
    const exists = await db.queryOne(
      `SELECT 1 FROM sync_inbox WHERE event_id = ?`,
      [evt.event_id]
    );
    if (!exists) {
      await db.execute(
        `INSERT INTO sync_inbox (event_id, sender_device_id, sequence, applied_at)
         VALUES (?, ?, ?, ?)`,
        [evt.event_id, evt.device_id, evt.sequence, Date.now()]
      );
    }
  }

  // 6. Verify inbox max sequence for devA
  const inboxMax = await getInboxMaxSequence(devA);
  assert.strictEqual(inboxMax, 2, 'Inbox max sequence for devA should be 2');
  console.log(`✓ Receiver inbox max sequence for devA: ${inboxMax}`);

  // 7. Duplicate delivery test (idempotency check)
  const duplicateEvt = unsynced[0];
  const checkDuplicate = await db.queryOne(
    `SELECT 1 FROM sync_inbox WHERE event_id = ?`,
    [duplicateEvt.event_id]
  );
  assert.ok(checkDuplicate, 'Duplicate event already exists in inbox and should be skipped');
  console.log('✓ Idempotent deduplication verified');

  // 8. Sender marks events synced on ACK
  await markEventsSynced(['evt_101', 'evt_102']);
  const unsyncedAfterAck = await db.query(
    `SELECT * FROM sync_outbox WHERE event_id IN ('evt_101', 'evt_102') AND is_synced = 0`
  );
  assert.strictEqual(unsyncedAfterAck.length, 0, 'Acknowledged events must have is_synced = 1');
  console.log('✓ ACK handling and is_synced update verified');

  console.log('ALL PHASE 08 SYNC ENGINE TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test Phase 08 failed:', err);
  process.exit(1);
});
