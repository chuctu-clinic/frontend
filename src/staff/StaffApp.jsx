import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { StaffLayout } from './components/StaffLayout.jsx';
import { Empty, Loading } from '../shared/components/ui.jsx';
import { isAdmin, isStaff, useSession } from '../shared/lib/session.jsx';

import StaffLogin from './pages/auth/StaffLogin.jsx';
import { homeFor } from './home.js';
import ChangePassword from './pages/auth/ChangePassword.jsx';

import DailySchedule from './pages/staff/DailySchedule.jsx';
import Queue from './pages/staff/Queue.jsx';
import Patients from './pages/staff/Patients.jsx';
import PatientDetail from './pages/staff/PatientDetail.jsx';
import RecordForm from './pages/staff/RecordForm.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Accounts from './pages/admin/Accounts.jsx';
import Posts from './pages/admin/Posts.jsx';
import PostEditor from './pages/admin/PostEditor.jsx';
import PostPreview from './pages/admin/PostPreview.jsx';

// Khu tiếp tân và Admin, nằm dưới route "/noi-bo/*". Đường dẫn trong Routes bên dưới tính từ /noi-bo,
// còn liên kết (Link, Navigate, navigate) luôn ghi đủ "/noi-bo/…".

/** Chỉ hỗ trợ trải nghiệm: quyền thật luôn được Backend kiểm tra. */
function RequireStaff({ admin, children }) {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!isStaff(user)) return <Navigate to="/noi-bo/dang-nhap" replace />;
  if (user.mustChangePassword) return <Navigate to="/noi-bo/doi-mat-khau" replace />;
  if (admin && !isAdmin(user)) return <Navigate to="/noi-bo/lich-trong-ngay" replace />;
  return children;
}

/** Đường dẫn cũ /dat-ho: mở hộp thoại Thêm lịch khám ở Lịch trong ngày. */
function CounterBookingRedirect() {
  const [params] = useSearchParams();
  const pid = params.get('benh-nhan');
  return <Navigate to={pid ? `/noi-bo/lich-trong-ngay?dat=${pid}` : '/noi-bo/lich-trong-ngay?them=1'} replace />;
}

/** /noi-bo/ chuyển tới trang đầu tiên hợp với vai trò, hoặc trang đăng nhập. */
function Start() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  return <Navigate to={isStaff(user) ? homeFor(user) : '/noi-bo/dang-nhap'} replace />;
}

export default function StaffApp() {
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
        <Route path="phieu-kham/:appointmentId/ket-qua" element={<RecordForm />} />
        <Route path="*" element={<Empty title="Không tìm thấy trang">Đường dẫn này không có trong khu vực nội bộ.</Empty>} />
      </Route>

      <Route element={<RequireStaff admin><StaffLayout /></RequireStaff>}>
        <Route path="quan-tri" element={<Dashboard />} />
        <Route path="quan-tri/tai-khoan" element={<Accounts />} />
        <Route path="quan-tri/bai-viet" element={<Posts />} />
        <Route path="quan-tri/bai-viet/moi" element={<PostEditor />} />
        <Route path="quan-tri/bai-viet/:id" element={<PostEditor />} />
      </Route>

      {/* Xem thử bài viết như người đọc: toàn trang, không có khung nội bộ */}
      <Route path="quan-tri/bai-viet/xem-thu" element={<RequireStaff admin><PostPreview /></RequireStaff>} />
      <Route path="quan-tri/bai-viet/:id/xem-thu" element={<RequireStaff admin><PostPreview /></RequireStaff>} />
    </Routes>
  );
}
