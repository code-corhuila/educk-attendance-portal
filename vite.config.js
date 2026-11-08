import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SHELL_ORIGIN = new URL(process.env.VITE_SHELL_ORIGIN || 'http://localhost:3000').origin;
const securityHeaders = {
  'Content-Security-Policy': `frame-ancestors ${SHELL_ORIGIN}`,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export default defineConfig({
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
});
