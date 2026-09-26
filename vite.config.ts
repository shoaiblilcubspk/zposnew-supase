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
    build: {
      // Split heavy, rarely-changing vendor libraries out of the main app chunk so the
      // initial load is smaller and vendor code stays cached across app deploys (faster
      // repeat loads on web + native shells). Config-only; no business logic touched.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            // Split only large, self-contained leaf libraries. React core is kept whole and
            // router is left in the generic vendor chunk to avoid circular chunk graphs.
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (/recharts|d3-|victory|internmap/.test(id)) return 'vendor-charts';
            if (id.includes('jszip')) return 'vendor-jszip';
            if (/jsbarcode|react-barcode|qrcode/.test(id)) return 'vendor-barcode';
            if (id.includes('html5-qrcode')) return 'vendor-scanner';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            return 'vendor';
          },
        },
      },
    },
    optimizeDeps: {
      force: true,
      exclude: ['lucide-react', '@electric-sql/pglite', '@electric-sql/pglite-react'],
    },
  };
});
