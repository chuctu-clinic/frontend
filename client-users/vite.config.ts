import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ứng dụng khách, chạy ở gốc "/".
// Khi dev, /noi-bo được chuyển tiếp sang client-admin (cổng 5174) để hai ứng dụng dùng chung
// một địa chỉ và chung cookie phiên, giống khi triển khai thật.
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.API_TARGET || 'http://localhost:4000',
      '/noi-bo': { target: 'http://localhost:5174', ws: true },
    },
  },
});
