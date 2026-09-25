import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: mode === 'electron' ? '' : '/',
    assetsInclude: ['**/*.wasm'],
    plugins: [
      react(),
      // Local-first PWA: precache the whole app shell (JS/CSS/HTML/WASM) so a repeat visit
      // opens INSTANTLY and works fully offline. `autoUpdate` ships each deploy's revisioned
      // precache manifest and cleans old caches — fast reloads, never a stale cache, and NO
      // navigate-on-activate loop (that was the old `selfDestroying` bug). `manifest: false`
      // because the app injects a dynamic per-tenant web manifest in index.html.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,wasm}'],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // Icons + product/logo images — cache after first view so they never re-flicker
              // and are available offline.
              urlPattern: ({ request }: any) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'zpos-images',
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request }: any) => request.destination === 'font',
              handler: 'CacheFirst',
              options: { cacheName: 'zpos-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      port: 5173,
      strictPort: true,
      host: true,
    },
    optimizeDeps: {
      force: true,
      exclude: ['lucide-react', '@electric-sql/pglite', '@electric-sql/pglite-react'],
    },
  };
});
