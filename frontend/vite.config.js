import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5173', 10),
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5002',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5002',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5180
  }
});
