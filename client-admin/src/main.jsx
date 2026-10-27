import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// CSS nền tảng nạp trước để CSS riêng của từng trang ghi đè được
import '@chuctu/shared/styles.css';
import { SessionProvider } from '@chuctu/shared/lib/session.jsx';
import { setApiApp } from '@chuctu/shared/lib/api.js';
import App from './App.jsx';

// Phiên khu nội bộ tách riêng với phiên trang người dùng
setApiApp('staff');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/noi-bo">
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
