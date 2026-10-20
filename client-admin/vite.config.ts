import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ứng dụng nội bộ (tiếp tân và Admin), chạy dưới đường dẫn /noi-bo/.
// Khi dev nên mở qua http://localhost:5173/noi-bo/ (client-users chuyển tiếp sang đây).
export default defineConfig({
  base: '/noi-bo/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': process.env.API_TARGET || 'http://localhost:4000',
    },
  },
});
