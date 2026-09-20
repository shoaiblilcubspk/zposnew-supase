import assert from 'node:assert';
import { serializeMessage, MessageReassembler } from '../src/lib/mesh/meshProtocol.js';

console.log('--- TEST PHASE 07: WebRTC Wire Protocol & Framing ---');

// 1. Small payload test
const msg1 = {
  id: 'msg_001',
  type: 'EVENT_BATCH',
  senderDeviceId: 'dev_A',
  targetDeviceId: 'dev_B',
  payload: { events: [{ id: 'evt_1', type: 'SALE_CREATED' }] },
  timestamp: Date.now(),
};

const frames1 = serializeMessage(msg1);
assert.strictEqual(frames1.length, 1, 'Single frame expected for small message');
assert.strictEqual(frames1[0].msgId, 'msg_001');

const reassembler = new MessageReassembler();
const result1 = reassembler.addFrame(frames1[0]);
assert.ok(result1, 'Reassembled message should not be null');
assert.strictEqual(result1.id, 'msg_001');
assert.deepStrictEqual(result1.payload, msg1.payload);
console.log('✓ Small message single-frame test passed');

// 2. Large payload chunking test (> 16KB)
const largeArray = [];
for (let i = 0; i < 500; i++) {
  largeArray.push({
    id: `evt_chunk_${i}`,
    type: 'INVENTORY_TX',
    notes: 'Bulk stock synchronisation data simulating heavy local sync batch transaction payload',
    data: { item: i, rand: Math.random().toString(36) },
  });
}

const msg2 = {
  id: 'msg_large_002',
  type: 'EVENT_BATCH',
  senderDeviceId: 'dev_A',
  targetDeviceId: 'dev_B',
  payload: { items: largeArray },
  timestamp: Date.now(),
};

const frames2 = serializeMessage(msg2);
console.log(`Large message generated ${frames2.length} chunks (payload size ~${JSON.stringify(msg2.payload).length} bytes)`);
assert.ok(frames2.length > 1, 'Multi-frame expected for large message');

let result2 = null;
// Deliver frames in shuffle or order
for (let i = 0; i < frames2.length; i++) {
  const res = reassembler.addFrame(frames2[i]);
  if (i === frames2.length - 1) {
    result2 = res;
  } else {
    assert.strictEqual(res, null, `Intermediate frame ${i} should return null`);
  }
}

assert.ok(result2, 'Final frame must return reassembled message');
assert.strictEqual(result2.id, 'msg_large_002');
assert.strictEqual(result2.payload.items.length, 500);
console.log('✓ Multi-chunk message fragmentation & reassembly passed');

console.log('ALL PHASE 07 PROTOCOL TESTS PASSED!');
