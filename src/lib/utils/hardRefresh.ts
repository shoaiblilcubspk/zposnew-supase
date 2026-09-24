/**
 * Hard Refresh Utility for All Supported Platforms
 * (macOS DMG, Windows EXE, Linux, Web Browser, Android APK, iOS IPA)
 * 
 * Safely clears web caches, unregisters service workers, optionally forces
 * cloud sync, and reloads the native view/browser without touching authoritative SQLite.
 */
export async function executeHardRefresh(forceSync?: () => Promise<void>): Promise<void> {
  try {
    // 1. Mark session so app knows it just hard-refreshed
    try {
      sessionStorage.setItem('pos_hard_refresh_toast', '1');
    } catch {
      // ignore quota / restricted storage
    }

    // 2. Trigger quick cloud sync pulse if online (with 600ms timeout)
    if (forceSync) {
      try {
        await Promise.race([
          forceSync(),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
      } catch (err) {
        console.warn('[HardRefresh] sync pulse failed:', err);
      }
    }

    // 3. Clear CacheStorage (PWA / Webview / Electron caches)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      } catch (err) {
        console.warn('[HardRefresh] CacheStorage clear error:', err);
      }
    }

    // 4. Unregister Service Workers to guarantee zero stale cache
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      } catch (err) {
        console.warn('[HardRefresh] ServiceWorker unregister error:', err);
      }
    }
  } catch (err) {
    console.error('[HardRefresh] Unexpected error during cleanup:', err);
  } finally {
    // 5. Force native / browser reload across all platforms
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
