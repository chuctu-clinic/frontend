import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { isStaff, useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { User } from '@chuctu/shared/types.ts';
import { NbError, NbField } from '../../components/nb.tsx';
import { PasswordInput, StaffShell, homeFor } from './StaffLogin.tsx';

/** Đổi mật khẩu; tài khoản dùng mật khẩu tạm phải đổi trước khi làm việc (BR.33). */
export default function ChangePassword() {
  useDocumentTitle('Đổi mật khẩu');
  const { user, setUser, loading } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (loading) return null;
  if (!isStaff(user)) return <Navigate to="/dang-nhap" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!form.currentPassword) fe.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    if (form.newPassword.length < 8) fe.newPassword = 'Mật khẩu mới cần ít nhất 8 ký tự.';
    if (form.newPassword !== form.confirm) fe.confirm = 'Hai mật khẩu chưa giống nhau.';
    setFields(fe);
    if (Object.keys(fe).length) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setUser(res.user);
      navigate(homeFor(res.user), { replace: true });
    } catch (err) {
      const apiErr = err as ApiError;
      setFields(apiErr.fields);
      setError(apiErr);
    } finally {
      setPending(false);
    }
  };

  return (
    <StaffShell
      title="Đổi mật khẩu"
      icon="lock"
      intro={user.mustChangePassword ? 'Tài khoản đang dùng mật khẩu tạm do quản trị viên cấp. Cô chú đặt mật khẩu mới để bắt đầu làm việc.' : 'Đặt mật khẩu mới cho tài khoản của cô chú.'}
    >
      <form className="nb-stack" style={{ gap: 24 }} onSubmit={submit} noValidate>
        <NbField label="Mật khẩu hiện tại" error={fields.currentPassword}>
          {(a) => <PasswordInput autoComplete="current-password" value={form.currentPassword} onChange={(v) => setForm({ ...form, currentPassword: v })} {...a} />}
        </NbField>
        <NbField label="Mật khẩu mới" hint="Tối thiểu 8 ký tự." error={fields.newPassword}>
          {(a) => <PasswordInput autoComplete="new-password" value={form.newPassword} onChange={(v) => setForm({ ...form, newPassword: v })} {...a} />}
        </NbField>
        <NbField label="Nhập lại mật khẩu mới" error={fields.confirm}>
          {(a) => <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} {...a} />}
        </NbField>
        <NbError error={error && !Object.keys(error.fields).length ? error : null} />
        <button type="submit" className="nb-btn nb-btn-primary" disabled={pending}>
          <Icon name="check" />
          Lưu mật khẩu mới
        </button>
        {!user.mustChangePassword && (
          <Link to={homeFor(user)} className="nb-link" style={{ justifyContent: 'center' }}>
            Quay lại khu nội bộ
          </Link>
        )}
      </form>
    </StaffShell>
  );
}
