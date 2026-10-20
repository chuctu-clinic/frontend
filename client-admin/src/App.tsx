import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { StaffLayout } from './components/StaffLayout.tsx';
import { NbEmpty, NbLoading } from './components/nb.tsx';
import { isAdmin, isStaff, useSession } from '@chuctu/shared/lib/session.tsx';

import StaffLogin, { homeFor } from './pages/auth/StaffLogin.tsx';
import ChangePassword from './pages/auth/ChangePassword.tsx';

import DailySchedule from './pages/staff/DailySchedule.tsx';
import Queue from './pages/staff/Queue.tsx';
import Patients from './pages/staff/Patients.tsx';
import PatientDetail from './pages/staff/PatientDetail.tsx';
import RecordForm from './pages/staff/RecordForm.tsx';

import Dashboard from './pages/admin/Dashboard.tsx';
import Accounts from './pages/admin/Accounts.tsx';
import Posts from './pages/admin/Posts.tsx';
import PostEditor from './pages/admin/PostEditor.tsx';
import PostPreview from './pages/admin/PostPreview.tsx';

// Ứng dụng cho tiếp tân và Admin, chạy dưới /noi-bo/ (basename của router).
// Mọi đường dẫn bên dưới tính từ /noi-bo, ví dụ "/quan-tri" là /noi-bo/quan-tri.

/** Chỉ hỗ trợ trải nghiệm: quyền thật luôn được Backend kiểm tra. */
function RequireStaff({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <NbLoading />;
  if (!isStaff(user)) return <Navigate to="/dang-nhap" replace />;
  if (user.mustChangePassword) return <Navigate to="/doi-mat-khau" replace />;
  if (admin && !isAdmin(user)) return <Navigate to="/lich-trong-ngay" replace />;
  return children;
}

/** /noi-bo/ chuyển tới trang đầu tiên hợp với vai trò, hoặc trang đăng nhập. */
function Start() {
  const { user, loading } = useSession();
  if (loading) return <NbLoading />;
  return <Navigate to={isStaff(user) ? homeFor(user) : '/dang-nhap'} replace />;
}

/** Đường dẫn cũ /dat-ho: đặt hộ nay là hộp thoại "Thêm lịch khám" trên Lịch trong ngày. */
function CounterBookingRedirect() {
  const [params] = useSearchParams();
  const id = params.get('benh-nhan');
  return <Navigate to={`/lich-trong-ngay?them=1${id ? `&benh-nhan=${id}` : ''}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route index element={<Start />} />
      <Route path="dang-nhap" element={<StaffLogin />} />
      <Route path="doi-mat-khau" element={<ChangePassword />} />

      <Route element={<RequireStaff><StaffLayout /></RequireStaff>}>
        <Route path="lich-trong-ngay" element={<DailySchedule />} />
        <Route path="dat-ho" element={<CounterBookingRedirect />} />
        <Route path="hang-doi" element={<Queue />} />
        <Route path="benh-nhan" element={<Patients />} />
        <Route path="benh-nhan/:id" element={<PatientDetail />} />
        <Route path="*" element={<NbEmpty title="Không tìm thấy trang">Đường dẫn này không có trong khu vực nội bộ.</NbEmpty>} />
      </Route>
      <Route element={<RequireStaff><StaffLayout solo /></RequireStaff>}>
        <Route path="phieu-kham/:appointmentId/ket-qua" element={<RecordForm />} />
      </Route>

      <Route element={<RequireStaff admin><StaffLayout /></RequireStaff>}>
        <Route path="quan-tri" element={<Dashboard />} />
        <Route path="quan-tri/tai-khoan" element={<Accounts />} />
        <Route path="quan-tri/bai-viet" element={<Posts />} />
      </Route>
      <Route element={<RequireStaff admin><StaffLayout solo /></RequireStaff>}>
        <Route path="quan-tri/bai-viet/moi" element={<PostEditor />} />
        <Route path="quan-tri/bai-viet/:id" element={<PostEditor />} />
      </Route>
      <Route path="quan-tri/bai-viet/xem-thu" element={<RequireStaff admin><PostPreview /></RequireStaff>} />
      <Route path="quan-tri/bai-viet/:id/xem-thu" element={<RequireStaff admin><PostPreview /></RequireStaff>} />
    </Routes>
  );
}
