import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    // HMR fixed for Windows local - no clientPort 443
    hmr: {
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'saddlebrown-ape-891436.hostingersite.com',
        changeOrigin: true,
        secure: false,
      },
      '/t': {
        target: 'saddlebrown-ape-891436.hostingersite.com',
        changeOrigin: true,
        secure: false,
      },
      '/unsubscribe': {
        target: 'saddlebrown-ape-891436.hostingersite.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
