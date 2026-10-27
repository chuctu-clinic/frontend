import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Một ứng dụng: trang khách ở "/", khu nội bộ (tiếp tân và Admin) ở "/noi-bo/".
export default defineConfig({
  plugins: [react()],
  // Firebase (gửi mã xác nhận) và trình soạn bài chỉ được tải khi cần. Khai báo sẵn để Vite đóng gói ngay khi khởi động,
  // không phải phát hiện giữa chừng (khi đó trang tải lỗi "Outdated Optimize Dep" cho tới khi tải lại).
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-image',
      '@tiptap/extension-table',
      '@tiptap/extensions',
      'mammoth',
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
