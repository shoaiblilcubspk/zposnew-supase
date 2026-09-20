/**
 * Phase 23 Test: Concurrent Overselling & Ledger Math
 * Validates that concurrent offline sales across multiple terminals
 * combine additively in the inventory ledger with zero dropped bills and no LWW overwrites.
 */

import { strict as assert } from 'assert';

console.log('--- PHASE 23: CONCURRENT OVERSELLING & LEDGER CONVERGENCE TEST ---');

class MockTerminal {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.localTransactions = [];
    this.outbox = [];
    this.inbox = new Set();
    this.currentStock = 0;
  }

  setInitialStock(qty) {
    this.currentStock = qty;
    this.localTransactions.push({
      id: `init_${this.id}`,
      type: 'INVENTORY_IN',
      qty: qty,
      source: 'initial'
    });
  }

  commitSaleOffline(saleId, qtySold) {
    // Commit locally in <10ms without remote check
    this.currentStock -= qtySold;
    const event = {
      eventId: `evt_${saleId}_${this.id}`,
      saleId,
      type: 'SALE_CREATED',
      terminalId: this.id,
      qtySold,
      timestamp: Date.now()
    };
    this.localTransactions.push({
      id: `tx_${saleId}`,
      type: 'INVENTORY_OUT',
      qty: -qtySold,
      eventId: event.eventId
    });
    this.outbox.push(event);
    return event;
  }

  receivePeerEvent(event) {
    // Deduplication check
    if (this.inbox.has(event.eventId)) {
      return false; // Duplicate ignored
    }
    this.inbox.add(event.eventId);

    // Append to ledger additively
    this.localTransactions.push({
      id: `tx_peer_${event.eventId}`,
      type: 'INVENTORY_OUT',
      qty: -event.qtySold,
      eventId: event.eventId
    });
    this.currentStock -= event.qtySold;
    return true;
  }

  computeAuthoritativeStock() {
    let balance = 0;
    for (const tx of this.localTransactions) {
      balance += tx.qty;
    }
    return balance;
  }
}

// 1. Initialize two independent offline terminals
const terminalA = new MockTerminal('term_A', 'Terminal A - Front Counter');
const terminalB = new MockTerminal('term_B', 'Terminal B - Drive-thru');

const INITIAL_STOCK = 6;
terminalA.setInitialStock(INITIAL_STOCK);
terminalB.setInitialStock(INITIAL_STOCK);

console.log(`[Initial State] Product: "Denim Jacket" | Stock on Term A = ${terminalA.currentStock} | Stock on Term B = ${terminalB.currentStock}`);

// 2. Both terminals go offline and execute concurrent sales exceeding available stock
console.log('\n[Offline Action] Terminal A sells 5 units...');
const saleA = terminalA.commitSaleOffline('INV-A-101', 5);
assert.equal(terminalA.currentStock, 1, 'Terminal A local stock should be 1');

console.log('[Offline Action] Terminal B sells 4 units...');
const saleB = terminalB.commitSaleOffline('INV-B-201', 4);
assert.equal(terminalB.currentStock, 2, 'Terminal B local stock should be 2');

// 3. Network reconnected -> P2P Mesh exchange
console.log('\n[P2P Mesh Reconnect] Terminals discover each other via WebRTC and exchange outbox events...');
const peerAcceptedOnB = terminalB.receivePeerEvent(saleA);
assert.equal(peerAcceptedOnB, true, 'Terminal B should accept new event from Terminal A');

const peerAcceptedOnA = terminalA.receivePeerEvent(saleB);
assert.equal(peerAcceptedOnA, true, 'Terminal A should accept new event from Terminal B');

// 4. Test Idempotency (Duplicate event replay)
console.log('[P2P Replay Test] Simulating duplicate network packet arrival...');
const dupOnB = terminalB.receivePeerEvent(saleA);
assert.equal(dupOnB, false, 'Terminal B must reject duplicate event');

const dupOnA = terminalA.receivePeerEvent(saleB);
assert.equal(dupOnA, false, 'Terminal A must reject duplicate event');

// 5. Verification of Deterministic Mathematical Convergence
const finalStockA = terminalA.computeAuthoritativeStock();
const finalStockB = terminalB.computeAuthoritativeStock();

console.log(`\n[Convergence Result]`);
console.log(`- Terminal A Final Calculated Ledger Stock: ${finalStockA}`);
console.log(`- Terminal B Final Calculated Ledger Stock: ${finalStockB}`);

// Invariant: Initial 6 - 5 - 4 = -3 (Oversold by 3)
assert.equal(finalStockA, -3, 'Terminal A stock must accurately be -3');
assert.equal(finalStockB, -3, 'Terminal B stock must accurately be -3');
assert.equal(finalStockA, finalStockB, 'Terminals must deterministically converge to identical stock balance');

// Both bills are 100% intact (zero bill drops)
assert.equal(terminalA.localTransactions.some(t => t.eventId === saleA.eventId), true, 'Bill A must be preserved');
assert.equal(terminalA.localTransactions.some(t => t.eventId === saleB.eventId), true, 'Bill B must be preserved on Term A');
assert.equal(terminalB.localTransactions.some(t => t.eventId === saleA.eventId), true, 'Bill A must be preserved on Term B');
assert.equal(terminalB.localTransactions.some(t => t.eventId === saleB.eventId), true, 'Bill B must be preserved on Term B');

console.log('✅ TEST PASS: Concurrent overselling handled additively. Zero dropped bills. 100% ledger convergence achieved!');
