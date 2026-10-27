import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Loading } from './shared/components/ui.jsx';

// Trang khách ở "/" và khu nội bộ (tiếp tân, Admin) ở "/noi-bo/" là hai phần tải riêng:
// khách không phải tải mã của khu nội bộ và ngược lại.
const SiteApp = lazy(() => import('./site/SiteApp.jsx'));
const StaffApp = lazy(() => import('./staff/StaffApp.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="noi-bo/*" element={<StaffApp />} />
        <Route path="*" element={<SiteApp />} />
      </Routes>
    </Suspense>
  );
}
