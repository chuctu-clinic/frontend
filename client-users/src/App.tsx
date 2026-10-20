import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthLayout, PublicLayout } from './components/PublicLayout.tsx';
import { Loading } from '@chuctu/shared/components/ui.tsx';
import { useSession } from '@chuctu/shared/lib/session.tsx';

import Home from './pages/public/Home.tsx';
import GioiThieu from './pages/public/GioiThieu.tsx';
import DichVu from './pages/public/DichVu.tsx';
import HuongDan from './pages/public/HuongDan.tsx';
import LienHe from './pages/public/LienHe.tsx';
import PostList from './pages/public/PostList.tsx';
import PostDetail from './pages/public/PostDetail.tsx';
import NotFound from './pages/public/NotFound.tsx';

import Login from './pages/auth/Login.tsx';
import Register from './pages/auth/Register.tsx';

import AccountInfo from './pages/account/AccountInfo.tsx';
import Profiles from './pages/account/Profiles.tsx';
import ProfileForm from './pages/account/ProfileForm.tsx';
import MyTickets from './pages/account/MyTickets.tsx';
import TicketDetail from './pages/account/TicketDetail.tsx';
import TicketResult from './pages/account/TicketResult.tsx';
import History from './pages/account/History.tsx';

import Booking from './pages/booking/Booking.tsx';

// Ứng dụng dành cho khách. Khu tiếp tân và Admin là ứng dụng riêng (client-admin) ở /noi-bo/.

/** Chỉ hỗ trợ trải nghiệm: quyền thật luôn được Backend kiểm tra. */
function RequireUser({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user || user.role !== 'USER') {
    return <Navigate to={`/dang-nhap?tiep=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="dang-nhap" element={<Login />} />
        <Route path="dang-ky" element={<Register />} />
      </Route>
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
        <Route path="tai-khoan/ho-so/moi" element={<RequireUser><ProfileForm /></RequireUser>} />
        <Route path="tai-khoan/ho-so/:id" element={<RequireUser><ProfileForm /></RequireUser>} />
        <Route path="phieu-kham" element={<RequireUser><MyTickets /></RequireUser>} />
        <Route path="phieu-kham/:id" element={<RequireUser><TicketDetail /></RequireUser>} />
        <Route path="phieu-kham/:id/ket-qua" element={<RequireUser><TicketResult /></RequireUser>} />
        <Route path="lich-su-kham" element={<RequireUser><History /></RequireUser>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
