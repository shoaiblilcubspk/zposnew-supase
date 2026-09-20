import assert from 'node:assert';
import { EscposBuilder } from '../src/lib/hardware/escposBuilder.ts';
import {
  buildReceiptEscpos,
  buildKotEscpos,
  testPrinter,
  kickCashDrawer,
} from '../src/lib/hardware/printerService.ts';

console.log('--- TEST PHASE 19: Hardware Thermal Printing & Scanner Drivers ---');

async function run() {
  // 1. Test ESC/POS Builder low-level commands
  const builder = new EscposBuilder('80mm');
  builder
    .align('center')
    .bold(true)
    .textLine('STORE TITLE')
    .divider('=')
    .tableRow('Item Name', '100.00')
    .kickDrawer()
    .cut();

  const rawBytes = builder.build();
  assert.ok(rawBytes.length > 20);

  // Check ESC @ init: 0x1B, 0x40
  assert.strictEqual(rawBytes[0], 0x1B);
  assert.strictEqual(rawBytes[1], 0x40);

  // Check drawer kick bytes: 0x1B, 0x70, 0x00, 0x19, 0xFA
  let hasDrawerKick = false;
  for (let i = 0; i < rawBytes.length - 4; i++) {
    if (
      rawBytes[i] === 0x1B &&
      rawBytes[i + 1] === 0x70 &&
      rawBytes[i + 2] === 0x00 &&
      rawBytes[i + 3] === 0x19 &&
      rawBytes[i + 4] === 0xFA
    ) {
      hasDrawerKick = true;
      break;
    }
  }
  assert.strictEqual(hasDrawerKick, true);
  console.log('✓ ESC/POS builder generated valid init, table, and cash drawer kick sequence');

  // 2. Test 80mm Receipt Builder
  const receiptPayload = {
    storeName: 'Zaynahs Fashion & Retail',
    storeAddress: 'Mall Road, Lahore',
    storePhone: '042-35760000',
    invoiceNumber: 'INV-2026-0099',
    date: Date.now(),
    cashierName: 'Muhammad Bilal',
    items: [
      { name: 'Embroidered Kurti', quantity: 2, price: 2500, total: 5000 },
      { name: 'Silk Stole', quantity: 1, price: 1200, total: 1200 },
    ],
    subtotal: 6200,
    discount: 200,
    tax: 0,
    total: 6000,
    paymentMethod: 'cash',
    tendered: 6000,
    change: 0,
    footerNote: 'Thank you for shopping with us!',
  };

  const receipt80Bytes = buildReceiptEscpos(receiptPayload, {
    transport: 'network',
    paperSize: '80mm',
    autoCut: true,
    kickCashDrawer: true,
    beepOnPrint: true,
  });

  assert.ok(receipt80Bytes.length > 100);
  console.log(`✓ 80mm thermal receipt formatted: ${receipt80Bytes.length} bytes`);

  // 3. Test 58mm Receipt Builder
  const receipt58Bytes = buildReceiptEscpos(receiptPayload, {
    transport: 'bluetooth',
    paperSize: '58mm',
    autoCut: true,
    kickCashDrawer: false,
    beepOnPrint: false,
  });
  assert.ok(receipt58Bytes.length > 80);
  console.log(`✓ 58mm compact thermal receipt formatted: ${receipt58Bytes.length} bytes`);

  // 4. Test Kitchen Order Ticket (KOT) Builder
  const kotBytes = buildKotEscpos(
    [
      { name: 'Chicken Biryani (Double Special)', quantity: 2, notes: 'Extra raita' },
      { name: 'Mint Lemonade', quantity: 2 },
    ],
    'TABLE-04',
    {
      transport: 'network',
      paperSize: '80mm',
      autoCut: true,
      kickCashDrawer: false,
      beepOnPrint: false,
    }
  );
  assert.ok(kotBytes.length > 50);
  console.log(`✓ Kitchen Order Ticket (KOT) formatted: ${kotBytes.length} bytes`);

  // 5. Test Hardware Dispatcher & Drawer Kick
  const testSuccess = await testPrinter({
    transport: 'network',
    address: '192.168.1.200:9100',
    paperSize: '80mm',
    autoCut: true,
    kickCashDrawer: true,
    beepOnPrint: true,
  });
  assert.strictEqual(testSuccess, true);

  const drawerSuccess = await kickCashDrawer({
    transport: 'usb',
    paperSize: '80mm',
    autoCut: false,
    kickCashDrawer: true,
    beepOnPrint: false,
  });
  assert.strictEqual(drawerSuccess, true);
  console.log('✓ Hardware test print and cash drawer solenoid pulse verified');

  console.log('--- ALL PHASE 19 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 19 Test Failed:', err);
  process.exit(1);
});
