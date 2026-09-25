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
      VitePWA({
        selfDestroying: true,
        manifest: false,
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
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/') || id.includes('/react-router')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory') || id.includes('/d3/')) return 'vendor-charts';
            if (id.includes('jszip') || id.includes('xlsx') || id.includes('papaparse')) return 'vendor-files';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor';
          },
        },
      },
    },
  };
});
