import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// CSS nền tảng nạp trước để CSS riêng của từng trang ghi đè được
import '@chuctu/shared/styles.css';
import { SessionProvider } from '@chuctu/shared/lib/session.tsx';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/noi-bo">
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
