/**
 * useProductImage
 * Resolves a product image value into a renderable URL.
 *
 * Accepts either:
 *  - a content-addressed SHA-256 hash (new architecture, AGENTS.md 2.8)
 *  - a legacy base64 data URI or http(s) URL (backward compatibility)
 *
 * For a hash, it resolves the local blob to an object URL. If the blob is
 * missing locally (e.g. product synced from a peer but image not yet
 * transferred), it requests the image from peers and reactively updates
 * once the transfer completes.
 */

import { useEffect, useState } from 'react';
import { getImageUrl, isImageHash, onImageSaved } from '../lib/media/localImageStore';

export function useProductImage(value: string | undefined | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    value && !isImageHash(value) ? value : undefined
  );

  useEffect(() => {
    let cancelled = false;

    if (!value) {
      setUrl(undefined);
      return;
    }

    // Legacy base64 data URI or direct URL — render as-is.
    if (!isImageHash(value)) {
      setUrl(value);
      return;
    }

    const resolve = async () => {
      const resolved = await getImageUrl(value);
      if (cancelled) return;
      // Cloud-direct: images resolve from the local content-addressed store (hydrated from
      // Supabase Storage). If not present yet, it will appear once the asset is cached.
      setUrl(resolved || undefined);
    };

    resolve();

    const unsub = onImageSaved((savedHash) => {
      if (savedHash === value) resolve();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [value]);

  return url;
}

