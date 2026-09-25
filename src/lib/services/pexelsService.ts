/**
 * Pexels API client (image search). Uses the synced key from integration_settings; sends it ONLY
 * in the Authorization header, never logs it. In-memory cache per query+page+filters (short TTL)
 * avoids repeat requests / re-renders. Respects the rate limit (429 → back off, no bypass).
 * Docs: https://www.pexels.com/api/
 */

import { getPexelsKey } from './integrationSettingsService';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;            // photo page (for credit link)
  photographer: string;
  photographer_url: string;
  avg_color: string;
  alt: string;
  src: { original: string; large2x: string; large: string; medium: string; small: string; portrait: string; landscape: string; tiny: string };
}
export interface PexelsSearchResult {
  photos: PexelsPhoto[];
  page: number;
  perPage: number;
  totalResults: number;
  nextPage: number | null;
  rateRemaining: string | null;
  rateReset: string | null;
}
export interface PexelsFilters { orientation?: 'landscape' | 'portrait' | 'square'; size?: 'large' | 'medium' | 'small'; color?: string; }

const BASE = 'https://api.pexels.com/v1';
const CACHE_TTL_MS = 3 * 60_000;
const cache = new Map<string, { at: number; data: PexelsSearchResult }>();

export class PexelsError extends Error {
  code: 'no_key' | 'invalid_key' | 'rate_limited' | 'offline' | 'error';
  constructor(code: PexelsError['code'], message: string) { super(message); this.code = code; this.name = 'PexelsError'; }
}

function isOnline(): boolean { return typeof navigator === 'undefined' ? true : navigator.onLine; }

async function call(path: string, params: Record<string, string | number | undefined>): Promise<PexelsSearchResult> {
  const key = await getPexelsKey();
  if (!key) throw new PexelsError('no_key', 'Add a Pexels API key in Settings → Integrations.');
  if (!isOnline()) throw new PexelsError('offline', 'Search needs internet; your saved library still works offline.');

  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${BASE}${path}?${qs}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: key } });
  } catch {
    throw new PexelsError('offline', 'Network error — check your connection.');
  }
  if (res.status === 401) throw new PexelsError('invalid_key', 'Invalid Pexels API key.');
  if (res.status === 429) throw new PexelsError('rate_limited', 'Rate limit reached — please wait a bit.');
  if (!res.ok) throw new PexelsError('error', `Pexels returned ${res.status}.`);

  const json: any = await res.json();
  const data: PexelsSearchResult = {
    photos: json.photos || [],
    page: json.page || params.page as number || 1,
    perPage: json.per_page || params.per_page as number || 30,
    totalResults: json.total_results || 0,
    nextPage: json.next_page ? (Number(params.page || 1) + 1) : null,
    rateRemaining: res.headers.get('X-Ratelimit-Remaining'),
    rateReset: res.headers.get('X-Ratelimit-Reset'),
  };
  cache.set(url, { at: Date.now(), data });
  return data;
}

export async function searchPhotos(query: string, page = 1, filters: PexelsFilters = {}, perPage = 30): Promise<PexelsSearchResult> {
  const q = query.trim();
  if (!q) return curatedPhotos(page, perPage);
  return call('/search', { query: q, page, per_page: Math.min(perPage, 80), orientation: filters.orientation, size: filters.size, color: filters.color });
}

export async function curatedPhotos(page = 1, perPage = 30): Promise<PexelsSearchResult> {
  return call('/curated', { page, per_page: Math.min(perPage, 80) });
}

/** Fetch fresh src URLs for a photo id (used when a saved URL 404s). */
export async function getPhotoById(id: string | number): Promise<PexelsPhoto | null> {
  const key = await getPexelsKey();
  if (!key || !isOnline()) return null;
  try {
    const res = await fetch(`${BASE}/photos/${id}`, { headers: { Authorization: key } });
    if (!res.ok) return null;
    return (await res.json()) as PexelsPhoto;
  } catch { return null; }
}
