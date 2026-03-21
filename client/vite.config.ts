import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  const apiPort = env.API_PORT || process.env.API_PORT || '3001';
  const explicitProxy = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET;
  const proxyTarget = explicitProxy || `http://127.0.0.1:${apiPort}`;
  const clientPort = Number(
    env.DEV_CLIENT_PORT || process.env.DEV_CLIENT_PORT || '5173',
  );

  return {
    plugins: [react()],
    build: {
      outDir: '../build/client',
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      port: clientPort,
      /** Fail fast if the dev port is taken — frees you from guessing 5174 vs 5173. */
      strictPort: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
