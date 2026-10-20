import { Navigate, Route, Routes } from 'react-router-dom';
import { StaffLayout } from './components/StaffLayout.jsx';
import { Empty, Loading } from '@chuctu/shared/components/ui.jsx';
import { isAdmin, isStaff, useSession } from '@chuctu/shared/lib/session.jsx';

import StaffLogin, { homeFor } from './pages/auth/StaffLogin.jsx';
import ChangePassword from './pages/auth/ChangePassword.jsx';

import DailySchedule from './pages/staff/DailySchedule.jsx';
import CounterBooking from './pages/staff/CounterBooking.jsx';
import Queue from './pages/staff/Queue.jsx';
import Patients from './pages/staff/Patients.jsx';
import PatientDetail from './pages/staff/PatientDetail.jsx';
import RecordForm from './pages/staff/RecordForm.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Accounts from './pages/admin/Accounts.jsx';
import Posts from './pages/admin/Posts.jsx';
import PostEditor from './pages/admin/PostEditor.jsx';

// Ứng dụng cho tiếp tân và Admin, chạy dưới /noi-bo/ (basename của router).
// Mọi đường dẫn bên dưới tính từ /noi-bo, ví dụ "/quan-tri" là /noi-bo/quan-tri.

/** Chỉ hỗ trợ trải nghiệm: quyền thật luôn được Backend kiểm tra. */
function RequireStaff({ admin, children }) {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!isStaff(user)) return <Navigate to="/dang-nhap" replace />;
  if (user.mustChangePassword) return <Navigate to="/doi-mat-khau" replace />;
  if (admin && !isAdmin(user)) return <Navigate to="/lich-trong-ngay" replace />;
  return children;
}

/** /noi-bo/ chuyển tới trang đầu tiên hợp với vai trò, hoặc trang đăng nhập. */
function Start() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  return <Navigate to={isStaff(user) ? homeFor(user) : '/dang-nhap'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route index element={<Start />} />
      <Route path="dang-nhap" element={<StaffLogin />} />
      <Route path="doi-mat-khau" element={<ChangePassword />} />

      <Route element={<RequireStaff><StaffLayout /></RequireStaff>}>
        <Route path="lich-trong-ngay" element={<DailySchedule />} />
        <Route path="dat-ho" element={<CounterBooking />} />
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
    </Routes>
  );
}
