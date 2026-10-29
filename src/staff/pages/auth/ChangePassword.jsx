import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ErrorAlert, TextInput } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { isStaff, useSession } from '../../../shared/lib/session.jsx';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';
import { homeFor } from '../../lib/home.js';
import { MIN_PASSWORD_LENGTH, passwordErrors } from '../../lib/password.js';
import { AccountNameHint } from '../../components/fields.jsx';
import { StaffShell } from './StaffLogin.jsx';

/** Đổi mật khẩu tạm do quản trị viên cấp, trước khi vào làm việc. Tự đổi mật khẩu ở trang Thông tin tài khoản. */
export default function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu');
  const { user, setUser, loading } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;
  if (!isStaff(user)) return <Navigate to="/noi-bo/dang-nhap" replace />;
  if (!user.mustChangePassword) return <Navigate to="/noi-bo/tai-khoan" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const fields = passwordErrors(form);
    if (Object.keys(fields).length) {
      setError({ fields });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setUser(res.user);
      navigate(homeFor(res.user), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <StaffShell title="Đổi mật khẩu" subtitle="Tài khoản đang dùng mật khẩu tạm do quản trị viên cấp. Cô chú đặt mật khẩu mới để bắt đầu làm việc.">
      <form className="stack" onSubmit={submit} noValidate>
        <AccountNameHint value={user.email || user.phone} />
        <TextInput label="Mật khẩu hiện tại" required type="password" autoComplete="new-password" value={form.currentPassword} onChange={set('currentPassword')} error={error?.fields?.currentPassword} />
        <TextInput label="Mật khẩu mới" required type="password" autoComplete="new-password" hint={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`} value={form.newPassword} onChange={set('newPassword')} error={error?.fields?.newPassword} />
        <TextInput label="Nhập lại mật khẩu mới" required type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={error?.fields?.confirm} />
        {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
        <Button type="submit" size="lg" block loading={pending}>
          Lưu mật khẩu mới
        </Button>
      </form>
    </StaffShell>
  );
}
