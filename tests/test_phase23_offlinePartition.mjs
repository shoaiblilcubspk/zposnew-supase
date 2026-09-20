/**
 * Phase 23 Test: Multi-Terminal Offline Partition & Mesh Reconciliation
 * Validates that 3 disconnected terminals executing hundreds of transactions offline
 * reconcile to 100% data parity and financial convergence once connectivity is restored.
 */

import { strict as assert } from 'assert';

console.log('--- PHASE 23: MULTI-TERMINAL OFFLINE PARTITION & MESH RECONCILIATION ---');

class MeshNode {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.sales = new Map();
    this.returns = new Map();
    this.expenses = new Map();
    this.purchases = new Map();
    this.outbox = [];
    this.inbox = new Set();
    this.cashWalletBalance = 10000; // Starting cash 10,000
    this.inventoryStock = 100; // Starting stock 100
  }

  recordSaleOffline(saleId, amount, itemsCount) {
    const event = {
      eventId: `evt_sale_${saleId}`,
      entity: 'SALE',
      originNode: this.id,
      data: { saleId, amount, itemsCount },
      timestamp: Date.now()
    };
    this.sales.set(saleId, event.data);
    this.cashWalletBalance += amount;
    this.inventoryStock -= itemsCount;
    this.outbox.push(event);
    this.inbox.add(event.eventId);
  }

  recordReturnOffline(returnId, saleId, refundAmount, itemsCount) {
    const event = {
      eventId: `evt_ret_${returnId}`,
      entity: 'RETURN',
      originNode: this.id,
      data: { returnId, saleId, refundAmount, itemsCount },
      timestamp: Date.now()
    };
    this.returns.set(returnId, event.data);
    this.cashWalletBalance -= refundAmount;
    this.inventoryStock += itemsCount;
    this.outbox.push(event);
    this.inbox.add(event.eventId);
  }

  recordExpenseOffline(expenseId, amount, category) {
    const event = {
      eventId: `evt_exp_${expenseId}`,
      entity: 'EXPENSE',
      originNode: this.id,
      data: { expenseId, amount, category },
      timestamp: Date.now()
    };
    this.expenses.set(expenseId, event.data);
    this.cashWalletBalance -= amount;
    this.outbox.push(event);
    this.inbox.add(event.eventId);
  }

  recordPurchaseOffline(purchaseId, qty, totalCost) {
    const event = {
      eventId: `evt_pur_${purchaseId}`,
      entity: 'PURCHASE',
      originNode: this.id,
      data: { purchaseId, qty, totalCost },
      timestamp: Date.now()
    };
    this.purchases.set(purchaseId, event.data);
    this.inventoryStock += qty;
    this.cashWalletBalance -= totalCost;
    this.outbox.push(event);
    this.inbox.add(event.eventId);
  }

  receiveEvent(event) {
    if (this.inbox.has(event.eventId)) {
      return false; // Idempotent deduplication
    }
    this.inbox.add(event.eventId);

    switch (event.entity) {
      case 'SALE':
        this.sales.set(event.data.saleId, event.data);
        this.cashWalletBalance += event.data.amount;
        this.inventoryStock -= event.data.itemsCount;
        break;
      case 'RETURN':
        this.returns.set(event.data.returnId, event.data);
        this.cashWalletBalance -= event.data.refundAmount;
        this.inventoryStock += event.data.itemsCount;
        break;
      case 'EXPENSE':
        this.expenses.set(event.data.expenseId, event.data);
        this.cashWalletBalance -= event.data.amount;
        break;
      case 'PURCHASE':
        this.purchases.set(event.data.purchaseId, event.data);
        this.inventoryStock += event.data.qty;
        this.cashWalletBalance -= event.data.totalCost;
        break;
    }
    return true;
  }
}

// 1. Initialize 3 independent terminals
const nodeA = new MeshNode('node_A', 'Terminal 1 (Counter Front)');
const nodeB = new MeshNode('node_B', 'Terminal 2 (Counter Side)');
const nodeC = new MeshNode('node_C', 'Terminal 3 (Manager Tablet)');

console.log('[Setup] 3 Autonomous Nodes initialized with 10,000 Starting Cash and 100 Starting Stock.');

// 2. Simulate complete network partition: nodes operate 100% offline
console.log('\n[Partition Phase] All nodes disconnected from network. Generating mutations...');

// Node A: 50 sales, 5 returns, 2 expenses
for (let i = 1; i <= 50; i++) {
  nodeA.recordSaleOffline(`A-SALE-${i}`, 100, 2); // +100 cash, -2 stock
}
for (let i = 1; i <= 5; i++) {
  nodeA.recordReturnOffline(`A-RET-${i}`, `A-SALE-${i}`, 100, 2); // -100 cash, +2 stock
}
nodeA.recordExpenseOffline('A-EXP-1', 250, 'Cleaning');
nodeA.recordExpenseOffline('A-EXP-2', 150, 'Tea');

// Node B: 40 sales, 3 returns, 1 expense
for (let i = 1; i <= 40; i++) {
  nodeB.recordSaleOffline(`B-SALE-${i}`, 150, 3); // +150 cash, -3 stock
}
for (let i = 1; i <= 3; i++) {
  nodeB.recordReturnOffline(`B-RET-${i}`, `B-SALE-${i}`, 150, 3); // -150 cash, +3 stock
}
nodeB.recordExpenseOffline('B-EXP-1', 300, 'Stationery');

// Node C: 10 inventory restocks (purchases)
for (let i = 1; i <= 10; i++) {
  nodeC.recordPurchaseOffline(`C-PUR-${i}`, 20, 500); // +20 stock, -500 cash
}

console.log(`[Partition Status]`);
console.log(`- Node A Outbox size: ${nodeA.outbox.length} events`);
console.log(`- Node B Outbox size: ${nodeB.outbox.length} events`);
console.log(`- Node C Outbox size: ${nodeC.outbox.length} events`);

// 3. Reconnect & Mesh Reconciliation: Full Gossip Sync
console.log('\n[Mesh Sync Phase] Network restored. Exchanging outbox queues across full mesh topology...');

const allNodes = [nodeA, nodeB, nodeC];

// Simulate full mesh round-robin synchronization
for (const sender of allNodes) {
  for (const receiver of allNodes) {
    if (sender.id === receiver.id) continue;
    for (const event of sender.outbox) {
      receiver.receiveEvent(event);
    }
  }
}

// 4. Verify 100% Convergence and Financial Equivalence
console.log('\n[Verification Phase] Auditing peer databases...');

// Total sales across all nodes should be 50 + 40 = 90
assert.equal(nodeA.sales.size, 90, 'Node A must have 90 total sales');
assert.equal(nodeB.sales.size, 90, 'Node B must have 90 total sales');
assert.equal(nodeC.sales.size, 90, 'Node C must have 90 total sales');

// Total returns across all nodes should be 5 + 3 = 8
assert.equal(nodeA.returns.size, 8, 'Node A must have 8 returns');
assert.equal(nodeB.returns.size, 8, 'Node B must have 8 returns');
assert.equal(nodeC.returns.size, 8, 'Node C must have 8 returns');

// Total expenses: 2 + 1 = 3
assert.equal(nodeA.expenses.size, 3, 'Node A must have 3 expenses');
assert.equal(nodeB.expenses.size, 3, 'Node B must have 3 expenses');
assert.equal(nodeC.expenses.size, 3, 'Node C must have 3 expenses');

// Total purchases: 10
assert.equal(nodeA.purchases.size, 10, 'Node A must have 10 purchases');
assert.equal(nodeB.purchases.size, 10, 'Node B must have 10 purchases');
assert.equal(nodeC.purchases.size, 10, 'Node C must have 10 purchases');

// Check Financial Balance & Stock Convergence
console.log(`- Node A Final Cash: ${nodeA.cashWalletBalance} | Stock: ${nodeA.inventoryStock}`);
console.log(`- Node B Final Cash: ${nodeB.cashWalletBalance} | Stock: ${nodeB.inventoryStock}`);
console.log(`- Node C Final Cash: ${nodeC.cashWalletBalance} | Stock: ${nodeC.inventoryStock}`);

assert.equal(nodeA.cashWalletBalance, nodeB.cashWalletBalance, 'Node A & B cash wallet must match');
assert.equal(nodeB.cashWalletBalance, nodeC.cashWalletBalance, 'Node B & C cash wallet must match');

assert.equal(nodeA.inventoryStock, nodeB.inventoryStock, 'Node A & B stock must match');
assert.equal(nodeB.inventoryStock, nodeC.inventoryStock, 'Node B & C stock must match');

console.log('✅ TEST PASS: Multi-terminal network partition reconciled seamlessly with 100% convergence!');
