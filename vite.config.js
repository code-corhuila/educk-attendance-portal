import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const shellOrigin = new globalThis.URL(env.VITE_SHELL_ORIGIN || 'http://localhost:3000').origin;
  const securityHeaders = {
    'Content-Security-Policy': `frame-ancestors 'self' ${shellOrigin}`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  };
  return {
    plugins: [react()],
    resolve: {
      alias: {
        'shell/apiClient': fileURLToPath(new URL('./src/apiClient.js', import.meta.url))
      }
    },
    server: {
      port: 3003,
      host: true,
      headers: securityHeaders,
      proxy: {
        '/api': {
          target: 'http://localhost:8083',
          changeOrigin: true
        }
      }
    },
    preview: {
      headers: securityHeaders
    }
  };
});
