import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Brand } from '@chuctu/shared/components/Brand.jsx';
import { Button, ErrorAlert, TextInput } from '@chuctu/shared/components/ui.jsx';
import { USER_URL } from '@chuctu/shared/lib/apps.js';
import { api } from '@chuctu/shared/lib/api.js';
import { isStaff, useSession } from '@chuctu/shared/lib/session.jsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';

export const homeFor = (user) => (user.mustChangePassword ? '/doi-mat-khau' : user.role === 'ADMIN' ? '/quan-tri' : '/lich-trong-ngay');

export function StaffShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-200)', display: 'flex', alignItems: 'center', padding: '32px 16px' }}>
      <main className="card card-lg stack" style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
        <Brand tag="Khu vực nội bộ" />
        <div className="stack-sm">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}

/** Tiếp tân và Admin đăng nhập bằng số điện thoại hoặc email và mật khẩu (BR.06). */
export default function StaffLogin() {
  useDocumentTitle('Đăng nhập nội bộ');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (isStaff(user)) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/auth/staff/login', { identifier, password });
      setUser(res.user);
      navigate(homeFor(res.user), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <StaffShell title="Đăng nhập nội bộ" subtitle="Dành cho tiếp tân và quản trị viên phòng khám.">
      <form className="stack" onSubmit={submit} noValidate>
        <TextInput
          label="Số điện thoại hoặc email"
          required
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={error?.fields?.identifier}
        />
        <TextInput
          label="Mật khẩu"
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error?.fields?.password}
        />
        {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
        <Button type="submit" size="lg" block loading={pending}>
          Đăng nhập
        </Button>
        <p className="small">
          Quên mật khẩu? Liên hệ quản trị viên để được cấp mật khẩu tạm. <a href={USER_URL}>Về trang chủ</a>
        </p>
      </form>
    </StaffShell>
  );
}
