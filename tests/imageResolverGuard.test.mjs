/**
 * IMAGE RESOLVER GUARD — enforces the single shared image-render path.
 *
 * A product/bundle/media image value can be a content-addressed SHA-256 hash (new
 * architecture), a legacy base64 data URI, or a URL. Only the shared resolver
 * `ProductThumb` (src/shared/ui/ProductThumb.tsx) → `useProductImage` knows how to turn a
 * HASH into a renderable URL (local cache or Supabase bucket download with retry). Binding
 * such a value straight into a raw `<img src={...}>` shows the browser broken-image icon
 * whenever the value is a hash — the exact bug seen on product/logo/Media Library and then
 * again on the Bundle/Deal image, Bulk Edit, SearchableSelect and Transaction items.
 *
 * This guard scans the source tree and FAILS the build if any file (outside the tiny
 * by-design allowlist) renders a raw `<img>` whose `src={...}` expression references an
 * image/avatar/photo field. New image-capable UI must use `ProductThumb`. (AGENTS.md §2.14
 * "universal root-cause utilities" + §4.2 single-source UI.)
 *
 * Run: npx tsx tests/imageResolverGuard.test.mjs   (or: npm test)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');

// Files allowed to render a raw <img> bound to an image-ish value, by design:
//  - ProductThumb: it IS the resolver (renders the final <img> after resolving).
//  - Store logo is persisted as a directly-renderable value (data URI / URL) via
//    resolveToRenderable(), so it must render raw so it also works in print/PNG where an
//    async hook cannot run. Those files carry their own onError fallback.
const ALLOWLIST = new Set([
  'src/shared/ui/ProductThumb.tsx',            // the shared resolver itself
  'src/components/layout/HeaderImpl.tsx',       // store logo (data URI/URL + onError)
  'src/components/settings/LogoUpload.tsx',     // store logo preview (data URI/URL + onError)
  'src/components/settings/ReceiptPreviewBlocks.tsx', // store logo in receipt preview
  'src/components/pos/receipt/parts.tsx',       // printed receipt logo (data URI/URL)
  'src/components/pos/receipt/ReceiptHeader.tsx', // printed receipt logo (data URI/URL)
]);

// Capture the src={...} expression of every <img> tag.
const IMG_SRC = /<img\b[^>]*?\bsrc=\{([^}]+)\}/gis;
// Media-field signal in that expression (hash-capable value that needs the resolver).
const MEDIA_FIELD = /image|avatar|photo/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const files = walk(ROOT);
const violations = [];
for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  if (ALLOWLIST.has(rel)) continue;
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  // Files that resolve inline via the shared `useProductImage` hook are already correct —
  // they render the resolved URL themselves (the ProductThumb-equivalent inline pattern).
  if (/\buseProductImage\s*\(/.test(src)) continue;
  let m;
  IMG_SRC.lastIndex = 0;
  while ((m = IMG_SRC.exec(src)) !== null) {
    const expr = m[1].trim();
    if (MEDIA_FIELD.test(expr)) {
      violations.push({ rel, expr });
    }
  }
}

console.log('IMAGE RESOLVER GUARD — every image field renders through ProductThumb');
if (violations.length === 0) {
  console.log(`  ok - scanned ${files.length} files, zero raw <img> bound to a media field.`);
  console.log('\nAll image-resolver checks passed.');
} else {
  console.error(`\n${violations.length} image-resolver violation(s):`);
  for (const v of violations) console.error(`  - ${v.rel}\n      <img src={${v.expr}}>`);
  console.error('\nFix: render media through the shared resolver instead:');
  console.error('  <ProductThumb image={value} fallback={<Icon/>} imgClassName="..." />');
  console.error('(import { ProductThumb } from "…/shared/ui/ProductThumb")');
  process.exit(1);
}
