import { getDatabase, initDatabase } from '../src/lib/db';
import { createProduct, getProductById, updateProduct } from '../src/lib/services/catalog/productRepository';
import { commitLocalSale } from '../src/lib/services/sales/localSaleCommit';
import { voidSale } from '../src/lib/services/sales/saleEditCoordinator';
import { recomputeStockFromLedger, executeReconciledSaleVoid } from '../src/lib/sync/reconcilerOps';
import { handleRemoteSaleVoidEvent } from '../src/lib/services/sales/reversalEventHandlers';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE STOCK & REVERSAL TESTS ---');
  await initDatabase();
  const db = await getDatabase();

  // ----------------------------------------------------
  // TEST 1: Stock 0 -> Sell 5 -> -5 -> Delete Bill -> 0
  // ----------------------------------------------------
  console.log('\n[TEST 1] Starting stock 0, sell 5, delete bill...');
  const p0 = await createProduct({
    name: 'T-Shirt 0 Base',
    price: 100,
    cost: 50,
    stock: 0,
    trackInventory: true,
  });

  const sale0 = await commitLocalSale({
    invoiceNumber: `INV-TEST-0-${Date.now()}`,
    cashier: 'Admin',
    total: 500,
    items: [{
      id: 'item_0_1',
      product: p0,
      quantity: 5,
      price: 100,
      subtotal: 500,
    }],
    paymentMethod: 'cash',
  } as any);

  let p0AfterSale = await getProductById(p0.id);
  console.log('After selling 5 items, stock is:', p0AfterSale?.stock);
  if (p0AfterSale?.stock !== -5) throw new Error(`Expected -5, got ${p0AfterSale?.stock}`);

  await voidSale(sale0.id, 'Customer cancelled', 'Admin');
  let p0AfterVoid = await getProductById(p0.id);
  console.log('After deleting bill, stock is:', p0AfterVoid?.stock);
  if (p0AfterVoid?.stock !== 0) throw new Error(`Expected 0 after void, got ${p0AfterVoid?.stock}`);

  await recomputeStockFromLedger();
  let p0AfterRecomp = await getProductById(p0.id);
  console.log('After recomputeStockFromLedger, stock is:', p0AfterRecomp?.stock);
  if (p0AfterRecomp?.stock !== 0) throw new Error(`Expected 0 after ledger recompute, got ${p0AfterRecomp?.stock}`);
  console.log('✓ TEST 1 PASSED: Stock restored to exactly 0 (not +5)!');

  // ----------------------------------------------------
  // TEST 2: Stock 116 -> Sell 6 -> 110 -> Delete Bill -> 116
  // ----------------------------------------------------
  console.log('\n[TEST 2] Starting stock 116, sell 6, delete bill...');
  const p116 = await createProduct({
    name: 'Jeans 116 Base',
    price: 200,
    cost: 100,
    stock: 116,
    trackInventory: true,
  });

  const sale116 = await commitLocalSale({
    invoiceNumber: `INV-TEST-116-${Date.now()}`,
    cashier: 'Admin',
    total: 1200,
    items: [{
      id: 'item_116_1',
      product: p116,
      quantity: 6,
      price: 200,
      subtotal: 1200,
    }],
    paymentMethod: 'cash',
  } as any);

  let p116AfterSale = await getProductById(p116.id);
  console.log('After selling 6 items, stock is:', p116AfterSale?.stock);
  if (p116AfterSale?.stock !== 110) throw new Error(`Expected 110, got ${p116AfterSale?.stock}`);

  await voidSale(sale116.id, 'Customer changed mind', 'Admin');
  let p116AfterVoid = await getProductById(p116.id);
  console.log('After deleting bill, stock is:', p116AfterVoid?.stock);
  if (p116AfterVoid?.stock !== 116) throw new Error(`Expected 116 after void, got ${p116AfterVoid?.stock}`);

  await recomputeStockFromLedger();
  let p116AfterRecomp = await getProductById(p116.id);
  console.log('After recomputeStockFromLedger, stock is:', p116AfterRecomp?.stock);
  if (p116AfterRecomp?.stock !== 116) throw new Error(`Expected 116 after ledger recompute, got ${p116AfterRecomp?.stock}`);
  console.log('✓ TEST 2 PASSED: Stock restored to exactly 116 (not 122)!');

  // ----------------------------------------------------
  // TEST 3: Multi-Device P2P Reversal Idempotence
  // ----------------------------------------------------
  console.log('\n[TEST 3] Multi-Device P2P Reversal Idempotence...');
  const pPeer = await createProduct({
    name: 'Peer Item Base',
    price: 150,
    cost: 75,
    stock: 50,
    trackInventory: true,
  });

  const salePeer = await commitLocalSale({
    invoiceNumber: `INV-PEER-${Date.now()}`,
    cashier: 'Admin',
    total: 300,
    items: [{
      id: 'item_peer_1',
      product: pPeer,
      quantity: 2,
      price: 150,
      subtotal: 300,
    }],
    paymentMethod: 'cash',
  } as any);

  // Peer 1 voids locally
  await voidSale(salePeer.id, 'Peer 1 void', 'Admin');

  // Simulate Peer 2 receiving the same SALE_VOIDED event
  await db.transaction(async (tx) => {
    await handleRemoteSaleVoidEvent(
      {
        event_id: `evt_${Date.now()}`,
        device_id: 'DEV-PEER-2',
        entity_type: 'SALE',
        entity_id: salePeer.id,
        operation: 'UPDATE',
        event_type: 'SALE_VOIDED',
        payload: JSON.stringify({
          saleId: salePeer.id,
          invoiceNumber: salePeer.invoiceNumber,
          reason: 'Remote Peer void',
          timestamp: Date.now(),
        }),
        status: 'synced',
        retry_count: 0,
        created_at: Date.now(),
      } as any,
      tx
    );
  });

  // Check transactions count for this sale
  const txs = await db.query(
    `SELECT id, type, quantity FROM inventory_transactions WHERE reference_id = ?`,
    [salePeer.id]
  );
  console.log('Inventory transactions for peer sale:', txs);
  const returnTxs = txs.filter((t: any) => t.type === 'RETURN');
  if (returnTxs.length !== 1) {
    throw new Error(`Expected exactly 1 RETURN tx due to idempotent IDs, got ${returnTxs.length}`);
  }

  await recomputeStockFromLedger();
  const pPeerFinal = await getProductById(pPeer.id);
  console.log('Final stock after simulated peer sync:', pPeerFinal?.stock);
  if (pPeerFinal?.stock !== 50) throw new Error(`Expected 50, got ${pPeerFinal?.stock}`);
  console.log('✓ TEST 3 PASSED: Deterministic IDs prevent duplicate transactions across peers!');

  // ----------------------------------------------------
  // TEST 4: Draft Sale Void / Delete
  // ----------------------------------------------------
  console.log('\n[TEST 4] Draft Sale Deletion Guard...');
  const pDraft = await createProduct({
    name: 'Draft Item Base',
    price: 100,
    cost: 50,
    stock: 20,
    trackInventory: true,
  });

  const draftSale = await commitLocalSale({
    invoiceNumber: `INV-DRAFT-${Date.now()}`,
    cashier: 'Admin',
    total: 200,
    status: 'pending',
    notes: 'DRAFT_SALE',
    items: [{
      id: 'item_draft_1',
      product: pDraft,
      quantity: 2,
      price: 100,
      subtotal: 200,
    }],
    paymentMethod: 'cash',
  } as any);

  let pDraftCheck = await getProductById(pDraft.id);
  if (pDraftCheck?.stock !== 20) throw new Error(`Draft sale must not deduct stock: expected 20, got ${pDraftCheck?.stock}`);

  await voidSale(draftSale.id, 'Delete draft', 'Admin');
  pDraftCheck = await getProductById(pDraft.id);
  if (pDraftCheck?.stock !== 20) throw new Error(`Deleting draft must not add stock: expected 20, got ${pDraftCheck?.stock}`);
  console.log('✓ TEST 4 PASSED: Draft sale deletion does not touch stock!');

  // ----------------------------------------------------
  // TEST 5: Downward Stock Adjustment (Signed diff)
  // ----------------------------------------------------
  console.log('\n[TEST 5] Downward Stock Adjustment (signed diff)...');
  const pAdj = await createProduct({
    name: 'Adj Item Base',
    price: 100,
    cost: 50,
    stock: 10,
    trackInventory: true,
  });

  await updateProduct(pAdj.id, {
    ...pAdj,
    stock: 4, // reduce by 6
  });

  const pAdjCheck = await getProductById(pAdj.id);
  console.log('Stock after downward adjustment 10 -> 4 is:', pAdjCheck?.stock);
  if (pAdjCheck?.stock !== 4) throw new Error(`Expected 4, got ${pAdjCheck?.stock}`);

  await recomputeStockFromLedger();
  const pAdjRecomp = await getProductById(pAdj.id);
  console.log('Stock after recompute is:', pAdjRecomp?.stock);
  if (pAdjRecomp?.stock !== 4) throw new Error(`Expected 4 after recompute, got ${pAdjRecomp?.stock}`);
  console.log('✓ TEST 5 PASSED: Downward stock adjustment properly records negative diff!');

  console.log('\n========================================');
  console.log('ALL 5 COMPREHENSIVE TESTS PASSED 100%!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
