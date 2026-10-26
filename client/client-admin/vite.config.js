import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ứng dụng nội bộ (tiếp tân và Admin), chạy dưới đường dẫn /noi-bo/.
// Khi dev nên mở qua http://localhost:5173/noi-bo/ (client-users chuyển tiếp sang đây).
export default defineConfig({
  base: '/noi-bo/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
  // Trình soạn bài chỉ được tải khi mở trang soạn (React.lazy). Khai báo sẵn để Vite đóng gói ngay khi khởi động,
  // không phải phát hiện giữa chừng (khi đó trang tải lỗi "Outdated Optimize Dep" cho tới khi tải lại).
  optimizeDeps: {
    include: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-table', '@tiptap/extensions', 'mammoth'],
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
