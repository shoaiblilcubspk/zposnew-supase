import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    base: mode === 'electron' ? '' : '/',
    assetsInclude: ['**/*.wasm'],
    plugins: [
      react(),
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
