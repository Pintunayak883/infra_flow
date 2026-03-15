import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    plugins: [react(), splitVendorChunkPlugin()],
    base: env.VITE_BASE_PATH || '/',
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT) || 5173,
    },
    preview: {
      host: true,
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      sourcemap: !isProduction,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', '@headlessui/react'],
          },
        },
      },
    },
    define: {
      __APP_BUILD_ENV__: JSON.stringify(mode),
    },
  };
});
