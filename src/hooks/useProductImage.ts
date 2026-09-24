/**
 * useProductImage
 * Resolves a product image value into a renderable URL.
 *
 * Accepts either a content-addressed SHA-256 hash (new architecture) or a legacy base64/URL.
 * For a hash it resolves the local blob to an object URL; if missing locally it downloads from
 * the Supabase Storage bucket and caches it. If the download isn't ready yet (slow/offline), it
 * retries a few times with backoff and re-resolves when the device comes back online or the
 * blob is saved — so a valid cloud image never gets stuck as a broken icon.
 */

import { useEffect, useState } from 'react';
import { getImageUrl, isImageHash, onImageSaved } from '../lib/media/localImageStore';

export function useProductImage(value: string | undefined | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() =>
    value && !isImageHash(value) ? value : undefined
  );

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (!value) {
      setUrl(undefined);
      return;
    }

    // Legacy base64 data URI or direct URL — render as-is.
    if (!isImageHash(value)) {
      setUrl(value);
      return;
    }

    // Content-addressed hash: resolve from local store, else pull from the bucket. Retry a few
    // times with backoff so a slow/failed first fetch self-heals without a manual refresh.
    const RETRY_DELAYS = [800, 2000, 5000];
    const resolve = async (attempt = 0) => {
      const resolved = await getImageUrl(value);
      if (cancelled) return;
      if (resolved) {
        setUrl(resolved);
      } else if (attempt < RETRY_DELAYS.length) {
        timers.push(setTimeout(() => void resolve(attempt + 1), RETRY_DELAYS[attempt]));
      } else {
        setUrl(undefined); // give up for now — ProductThumb shows the fallback placeholder
      }
    };

    void resolve();

    const unsub = onImageSaved((savedHash) => { if (savedHash === value) void resolve(); });
    const onOnline = () => void resolve();
    if (typeof window !== 'undefined') window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      unsub();
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    };
  }, [value]);

  return url;
}

