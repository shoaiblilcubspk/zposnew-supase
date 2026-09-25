/*
 * KILL-SWITCH SERVICE WORKER (intentional).
 *
 * This app is Supabase-only / cloud-direct with a local SQLite mirror — it does NOT use a
 * service worker or CacheStorage (AGENTS.md ZERO-CACHE mandate). VitePWA has been removed, so
 * new visitors never register a SW. This file exists ONLY to cleanly retire any SW that older
 * builds registered on a user's device: when the browser re-fetches /sw.js it gets this script,
 * which unregisters itself and clears all caches — WITHOUT calling client.navigate(), so it
 * never triggers the extra reload/loop that made page reloads slow.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    try {
      await self.registration.unregister();
    } catch (e) { /* ignore */ }
    // NOTE: deliberately NO client.navigate() — avoids the reload loop.
  })());
});

// Never intercept fetches — always go straight to the network.
