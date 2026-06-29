import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// تطبيق ثابت يتصل بـ Firebase مباشرة (لا حاجة لخادم وسيط).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
