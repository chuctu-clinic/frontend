import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// CSS nền tảng nạp trước để CSS riêng của từng trang ghi đè được
import '@chuctu/shared/styles.css';
import App from './App.jsx';
import { SessionProvider } from '@chuctu/shared/lib/session.jsx';
import { setApiApp } from '@chuctu/shared/lib/api.js';
// Chuyển động nạp sau cùng để ghi đè transition trong CSS của từng trang
import './motion.css';

// Phiên trang người dùng tách riêng với phiên khu nội bộ
setApiApp('users');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
