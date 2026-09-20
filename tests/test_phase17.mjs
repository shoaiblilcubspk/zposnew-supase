import assert from 'node:assert';
import { initDatabase } from '../src/lib/db/index.ts';
import {
  computeSha256,
  saveImage,
  hasImage,
  getImageData,
  deleteImage,
  listMissingImages,
} from '../src/lib/media/localImageStore.ts';
import {
  handleImagePacket,
} from '../src/lib/media/p2pImageTransfer.ts';

console.log('--- TEST PHASE 17: Local Image Storage & P2P Binary Synchronization ---');

async function run() {
  const db = await initDatabase();

  // 1. Generate synthetic 45KB image data
  const sampleSize = 45 * 1024;
  const sampleBytes = new Uint8Array(sampleSize);
  for (let i = 0; i < sampleSize; i++) {
    sampleBytes[i] = (i * 31 + 7) % 256;
  }

  // 2. Compute SHA-256 checksum
  const expectedHash = await computeSha256(sampleBytes);
  assert.ok(expectedHash);
  assert.strictEqual(expectedHash.length, 64);
  console.log(`✓ Computed SHA-256 hash: ${expectedHash.slice(0, 16)}...`);

  // 3. Save Image Locally
  const saveResult = await saveImage(sampleBytes, 'image/webp');
  assert.strictEqual(saveResult.hash, expectedHash);
  assert.strictEqual(saveResult.size, sampleSize);

  const exists = await hasImage(expectedHash);
  assert.strictEqual(exists, true);

  const retrievedBytes = await getImageData(expectedHash);
  assert.ok(retrievedBytes);
  assert.strictEqual(retrievedBytes.length, sampleSize);
  assert.deepStrictEqual(retrievedBytes, sampleBytes);
  console.log('✓ Image saved and verified with bitwise equality');

  // 4. Test Chunked P2P Transmission and Reassembly
  const peerImageSize = 35 * 1024;
  const peerImageBytes = new Uint8Array(peerImageSize);
  for (let i = 0; i < peerImageSize; i++) {
    peerImageBytes[i] = (i * 17 + 13) % 256;
  }
  const peerImageHash = await computeSha256(peerImageBytes);

  // Split into 16KB chunks
  const CHUNK_SIZE = 16 * 1024;
  const totalChunks = Math.ceil(peerImageSize / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, peerImageSize);
    const chunk = peerImageBytes.slice(start, end);
    const chunkBase64 = Buffer.from(chunk).toString('base64');

    await handleImagePacket({
      type: 'IMAGE_CHUNK',
      hash: peerImageHash,
      chunkIndex: i,
      totalChunks,
      totalSize: peerImageSize,
      data: chunkBase64,
    });
  }

  // Verify reassembly and storage
  const peerImageExists = await hasImage(peerImageHash);
  assert.strictEqual(peerImageExists, true);
  const reassembled = await getImageData(peerImageHash);
  assert.deepStrictEqual(reassembled, peerImageBytes);
  console.log(`✓ Peer chunks reassembled and verified via SHA-256 integrity: ${peerImageHash.slice(0, 16)}...`);

  // 5. Test Corrupted Chunk Handling (Tampered byte)
  const corruptHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const corruptBytes = new Uint8Array(100);
  corruptBytes.fill(42);
  const corruptBase64 = Buffer.from(corruptBytes).toString('base64');

  await handleImagePacket({
    type: 'IMAGE_CHUNK',
    hash: corruptHash,
    chunkIndex: 0,
    totalChunks: 1,
    totalSize: 100,
    data: corruptBase64,
  });

  // Because hash mismatch occurred, it should NOT be saved
  const corruptExists = await hasImage(corruptHash);
  assert.strictEqual(corruptExists, false);
  console.log('✓ Corrupted chunk correctly discarded upon SHA-256 verification failure');

  // 6. Test listMissingImages
  const missingHash = 'missing_asset_hash_99999999999999999999999999999999999999999999';
  await db.execute(
    `INSERT INTO products (
      id, name, sku, cost_price, retail_price, stock, image_hash, active, created_at, updated_at
    ) VALUES ('prod_missing_img', 'Test Missing Image', 'TEST-MISS', 10, 20, 5, ?, 1, ?, ?);`,
    [missingHash, Date.now(), Date.now()]
  );

  const missingList = await listMissingImages();
  assert.ok(missingList.includes(missingHash));
  console.log('✓ listMissingImages accurately detected pending image asset');

  console.log('--- ALL PHASE 17 TESTS PASSED SUCCESSFULLY! ---');
}

run().catch((err) => {
  console.error('Phase 17 Test Failed:', err);
  process.exit(1);
});
