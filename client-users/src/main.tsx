import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// CSS nền tảng nạp trước để CSS riêng của từng trang ghi đè được
import '@chuctu/shared/styles.css';
import App from './App.tsx';
import { SessionProvider } from '@chuctu/shared/lib/session.tsx';
// Chuyển động nạp sau cùng để ghi đè transition trong CSS của từng trang
import './motion.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
