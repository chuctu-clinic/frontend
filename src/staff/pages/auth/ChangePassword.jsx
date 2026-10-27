import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ErrorAlert, TextInput } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { isStaff, useSession } from '../../../shared/lib/session.jsx';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';
import { homeFor } from '../../lib/home.js';
import { StaffShell } from './StaffLogin.jsx';

export default function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu');
  const { user, setUser, loading } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [mismatch, setMismatch] = useState(false);

  if (loading) return null;
  if (!isStaff(user)) return <Navigate to="/noi-bo/dang-nhap" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
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
    <StaffShell
      title="Đổi mật khẩu"
      subtitle={user.mustChangePassword ? 'Tài khoản đang dùng mật khẩu tạm do quản trị viên cấp. Cô chú đặt mật khẩu mới để bắt đầu làm việc.' : null}
    >
      <form className="stack" onSubmit={submit} noValidate>
        <TextInput label="Mật khẩu hiện tại" required type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={error?.fields?.currentPassword} />
        <TextInput label="Mật khẩu mới" required type="password" autoComplete="new-password" hint="Tối thiểu 8 ký tự." value={form.newPassword} onChange={set('newPassword')} error={error?.fields?.newPassword} />
        <TextInput
          label="Nhập lại mật khẩu mới"
          required
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set('confirm')}
          error={mismatch ? 'Hai mật khẩu chưa giống nhau.' : null}
        />
        {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
        <Button type="submit" size="lg" block loading={pending}>
          Lưu mật khẩu mới
        </Button>
      </form>
    </StaffShell>
  );
}
