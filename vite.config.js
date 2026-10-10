import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: { external: ['shell/apiClient'] },
    rolldownOptions: { external: ['shell/apiClient'] }
  },
  server: {
    port: 3003,
    host: true
  }
});
