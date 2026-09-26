-- 0024_bundle_barcode.sql
-- Bundles can now carry their own scannable barcode (like products), so a single scan adds the
-- whole deal to the cart and a bundle label can be printed. Additive, idempotent — matches the
-- product barcode pattern. apply_bundle inserts only the columns present in the payload, so no
-- RPC change is needed; the pull layer picks up the new column via SELECT *.

alter table public.bundles add column if not exists barcode text;

-- Fast lookup on scan (barcodes are not forced unique: a shop may legitimately reprint/duplicate,
-- and product/bundle spaces can overlap — the scan path resolves product first, then bundle).
create index if not exists idx_bundles_barcode on public.bundles(barcode);
