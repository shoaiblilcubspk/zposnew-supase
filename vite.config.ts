import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteLocalMeshPlugin } from './scripts/viteLocalMeshPlugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: mode === 'electron' ? '' : '/',
    assetsInclude: ['**/*.wasm'],
    plugins: [
      react(),
      viteLocalMeshPlugin(),
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
  };
});
