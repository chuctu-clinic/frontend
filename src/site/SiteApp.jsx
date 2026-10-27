import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout.jsx';
import { Loading } from '../shared/components/ui.jsx';
import { useSession } from '../shared/lib/session.jsx';

import Home from './pages/public/Home.jsx';
import GioiThieu from './pages/public/GioiThieu.jsx';
import DichVu from './pages/public/DichVu.jsx';
import HuongDan from './pages/public/HuongDan.jsx';
import LienHe from './pages/public/LienHe.jsx';
import PostList from './pages/public/PostList.jsx';
import PostDetail from './pages/public/PostDetail.jsx';
import NotFound from './pages/public/NotFound.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';

import AccountInfo from './pages/account/AccountInfo.jsx';
import Profiles from './pages/account/Profiles.jsx';
import MyTickets from './pages/account/MyTickets.jsx';
import TicketDetail from './pages/account/TicketDetail.jsx';
import TicketResult from './pages/account/TicketResult.jsx';
import History from './pages/account/History.jsx';

import Booking from './pages/booking/Booking.jsx';
// Chuyển động nạp sau cùng để ghi đè transition trong CSS của từng trang
import './motion.css';

// Trang dành cho khách, ở "/". Khu tiếp tân và Admin ở /noi-bo/ (src/staff).

/** Chỉ hỗ trợ trải nghiệm: quyền thật luôn được Backend kiểm tra. */
function RequireUser({ children }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user || user.role !== 'USER') {
    return <Navigate to={`/dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return children;
}

/**
 * Bấm liên kết tới đúng trang đang xem (logo, menu, chân trang…) thì lướt lên đầu trang.
 * Đổi sang trang khác đã tự lên đầu ở PublicLayout; liên kết có #mục vẫn cuộn tới mục đó như cũ.
 */
function useScrollTopOnSamePageLink() {
  useEffect(() => {
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin || url.hash || url.pathname !== here.pathname || url.search !== here.search) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

export default function SiteApp() {
  useScrollTopOnSamePageLink();
  return (
    <Routes>
      {/* Đăng nhập và tạo tài khoản có đầu trang, chân trang rút gọn riêng (AuthShell) */}
      <Route path="dang-nhap" element={<Login />} />
      <Route path="dang-ky" element={<Register />} />

      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="gioi-thieu" element={<GioiThieu />} />
        <Route path="dich-vu" element={<DichVu />} />
        <Route path="huong-dan" element={<HuongDan />} />
        <Route path="lien-he" element={<LienHe />} />
        <Route path="tin-tuc" element={<PostList />} />
        <Route path="tin-tuc/:id" element={<PostDetail />} />

        <Route path="dat-lich" element={<RequireUser><Booking /></RequireUser>} />
        <Route path="tai-khoan" element={<RequireUser><AccountInfo /></RequireUser>} />
        <Route path="tai-khoan/ho-so" element={<RequireUser><Profiles /></RequireUser>} />
        {/* /tai-khoan/ho-so/moi và /tai-khoan/ho-so/:id mở sẵn hộp thoại thêm / sửa hồ sơ */}
        <Route path="tai-khoan/ho-so/:id" element={<RequireUser><Profiles /></RequireUser>} />
        <Route path="phieu-kham" element={<RequireUser><MyTickets /></RequireUser>} />
        <Route path="phieu-kham/:id" element={<RequireUser><TicketDetail /></RequireUser>} />
        <Route path="phieu-kham/:id/ket-qua" element={<RequireUser><TicketResult /></RequireUser>} />
        <Route path="lich-su-kham" element={<RequireUser><History /></RequireUser>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
