import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import config from '../capacitor.config.ts';
import { CapacitorSqliteDriver } from '../src/lib/db/drivers/capacitorDriver.ts';
import {
  scanForBlePrinters,
  connectBlePrinter,
  sendBleRawData,
  disconnectBlePrinter,
} from '../src/lib/hardware/bluetoothPrinter.ts';

console.log('--- TEST PHASE 21: Capacitor Mobile Packaging (Native SQLite & BLE) ---');

async function run() {
  // 1. Validate capacitor.config.ts configuration
  assert.ok(config);
  assert.strictEqual(config.appId, 'com.zaynahs.pos');
  assert.strictEqual(config.appName, 'Zaynahs POS');
  assert.strictEqual(config.webDir, 'dist');
  assert.ok(config.plugins?.CapacitorSQLite);
  console.log('✓ capacitor.config.ts verified with com.zaynahs.pos appId and CapacitorSQLite plugin');

  // 2. Validate CapacitorSqliteDriver
  const driver = new CapacitorSqliteDriver();
  assert.strictEqual(driver.name, 'CapacitorSqliteDriver');
  assert.strictEqual(driver.platform, 'capacitor');
  assert.strictEqual(driver.isOpen, false);
  console.log('✓ CapacitorSqliteDriver class instantiated and validated');

  // 3. Test Mobile Bluetooth Printer Driver
  const devices = await scanForBlePrinters();
  assert.ok(devices.length >= 1);
  console.log(`✓ Discovered ${devices.length} mobile thermal printer devices`);

  const connected = await connectBlePrinter(devices[0].id);
  assert.strictEqual(connected, true);
  console.log(`✓ Connected to BLE mobile printer: ${devices[0].name}`);

  const testPayload = new Uint8Array([0x1B, 0x40, 0x1B, 0x61, 0x01, 0x48, 0x49, 0x0A]);
  const sent = await sendBleRawData(testPayload);
  assert.strictEqual(sent, true);
  console.log('✓ Dispatched ESC/POS packet over Bluetooth Low Energy');

  await disconnectBlePrinter();
  console.log('✓ Disconnected BLE session cleanly');

  console.log('--- ALL PHASE 21 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 21 Test Failed:', err);
  process.exit(1);
});
