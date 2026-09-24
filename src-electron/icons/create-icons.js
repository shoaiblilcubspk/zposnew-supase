const fs = require('fs');

// Simple 1x1 transparent PNG base64, then we'll create proper ones
// For now just create placeholder files
const sizes = [16, 32, 48, 64, 128, 256, 512];

// Create a simple 512x512 PNG using a minimal valid PNG
// This is a 512x512 green square PNG (minimal)
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x02, 0x00, // width: 512
  0x00, 0x00, 0x02, 0x00, // height: 512
  0x08, 0x02, 0x00, 0x00, 0x00, // bit depth 8, color type 2 (RGB), compression 0, filter 0, interlace 0
  0x00, 0x00, 0x00, 0x00, // CRC (placeholder)
  0x00, 0x00, 0x00, 0x00, // IDAT length (placeholder)
  0x49, 0x44, 0x41, 0x54, // IDAT
  // Minimal compressed data for green image
  0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60,
  0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60,
  0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x60,
  0x00, 0x00, 0x00, 0x00, // CRC (placeholder)
  0x00, 0x00, 0x00, 0x00, // IEND length
  0x49, 0x45, 0x4E, 0x44, // IEND
  0xAE, 0x42, 0x60, 0x82  // IEND CRC
]);

// Actually, let's just create a proper simple PNG using a minimal approach
// Create a proper 512x512 green PNG
function createSimplePNG(width, height, r, g, b) {
  const crc32 = require('zlib').crc32;
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
    Buffer.from('IHDR'),
    ihdr,
    Buffer.alloc(4) // CRC placeholder
  ]);
  
  // Create image data (raw RGB)
  const rowSize = width * 3;
  const imageData = Buffer.alloc((rowSize + 1) * height); // +1 for filter byte per row
  for (let y = 0; y < height; y++) {
    imageData[y * (rowSize + 1)] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const offset = y * (rowSize + 1) + 1 + x * 3;
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
    }
  }
  
  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(imageData);
  
  const idatChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // length placeholder
    Buffer.from('IDAT'),
    compressed,
    Buffer.alloc(4) // CRC placeholder
  ]);
  idatChunk.writeUInt32BE(compressed.length, 0);
  
  // IEND
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  
  // Calculate CRCs
  function calcCRC(data) {
    return zlib.crc32(data);
  }
  
  const ihdrCRC = calcCRC(Buffer.concat([Buffer.from('IHDR'), ihdr]));
  ihdrChunk.writeUInt32BE(ihdrCRC, ihdrChunk.length - 4);
  
  const idatCRC = calcCRC(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idatChunk.writeUInt32BE(idatCRC, idatChunk.length - 4);
  
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);
}

const png512 = createSimplePNG(512, 512, 5, 150, 105); // Emerald green
fs.writeFileSync('icon-512.png', png512);
fs.copyFileSync('icon-512.png', 'icon.png');
fs.copyFileSync('icon-512.png', 'icon.icns');

// Create smaller sizes
for (const size of [16, 32, 48, 64, 128, 256]) {
  const png = createSimplePNG(size, size, 5, 150, 105);
  fs.writeFileSync(`icon-${size}.png`, png);
}

// Create .ico (simplified - just use 256)
fs.copyFileSync('icon-256.png', 'icon.ico');

console.log('Icons created successfully');
