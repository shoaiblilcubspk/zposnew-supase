const fs = require('fs');
const zlib = require('zlib');

function createSimplePNG(width, height, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const ihdrData = Buffer.concat([Buffer.from('IHDR'), ihdr]);
  const ihdrCRC = zlib.crc32(ihdrData);
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]),
    ihdrData,
    Buffer.from([(ihdrCRC >>> 24) & 0xFF, (ihdrCRC >>> 16) & 0xFF, (ihdrCRC >>> 8) & 0xFF, ihdrCRC & 0xFF])
  ]);
  
  // Create image data
  const rowSize = width * 3;
  const imageData = Buffer.alloc((rowSize + 1) * height);
  for (let y = 0; y < height; y++) {
    imageData[y * (rowSize + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const offset = y * (rowSize + 1) + 1 + x * 3;
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
    }
  }
  
  const compressed = zlib.deflateSync(imageData);
  const idatData = Buffer.concat([Buffer.from('IDAT'), compressed]);
  const idatCRC = zlib.crc32(idatData);
  const idatChunk = Buffer.concat([
    Buffer.from([
      (compressed.length >>> 24) & 0xFF,
      (compressed.length >>> 16) & 0xFF,
      (compressed.length >>> 8) & 0xFF,
      compressed.length & 0xFF
    ]),
    idatData,
    Buffer.from([(idatCRC >>> 24) & 0xFF, (idatCRC >>> 16) & 0xFF, (idatCRC >>> 8) & 0xFF, idatCRC & 0xFF])
  ]);
  
  // IEND
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);
}

const png512 = createSimplePNG(512, 512, 5, 150, 105);
fs.writeFileSync('icon-512.png', png512);
fs.copyFileSync('icon-512.png', 'icon.png');
fs.copyFileSync('icon-512.png', 'icon.icns');

for (const size of [16, 32, 48, 64, 128, 256]) {
  const png = createSimplePNG(size, size, 5, 150, 105);
  fs.writeFileSync(`icon-${size}.png`, png);
}

fs.copyFileSync('icon-256.png', 'icon.ico');

console.log('Icons created successfully');
