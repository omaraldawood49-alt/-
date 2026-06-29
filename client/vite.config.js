import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// في التطوير: نوجّه طلبات الـ API و Socket.IO إلى الخادم على المنفذ 3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
