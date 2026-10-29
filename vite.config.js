import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Một ứng dụng: trang khách ở "/", khu nội bộ (tiếp tân và Admin) ở "/noi-bo/".
export default defineConfig(({ mode }) => {
  // Đọc .env (xem .env.example). Các biến không có tiền tố VITE_ chỉ dùng ở đây, không vào mã của trình duyệt.
  const env = loadEnv(mode, process.cwd(), '');
  return {
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
      port: Number(env.DEV_PORT || 5173),
      strictPort: true,
      proxy: {
        '/api': env.DEV_API_TARGET || 'http://localhost:4000',
      },
    },
  };
});
