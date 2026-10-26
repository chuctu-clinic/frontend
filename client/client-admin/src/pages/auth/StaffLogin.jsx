import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Button, ErrorAlert, Field, TextInput } from '@chuctu/shared/components/ui.jsx';
import { USER_URL } from '@chuctu/shared/lib/apps.js';
import { api } from '@chuctu/shared/lib/api.js';
import { CLINIC } from '@chuctu/shared/lib/format.js';
import { isStaff, useSession } from '@chuctu/shared/lib/session.jsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import './staff-auth.css';

export const homeFor = (user) => (user.mustChangePassword ? '/doi-mat-khau' : user.role === 'ADMIN' ? '/quan-tri' : '/lich-trong-ngay');

/** Khung trang theo prototype "NoiBo-DangNhap": đầu trang "Khu quản trị", thẻ giữa trang, chân trang một dòng. */
export function StaffShell({ title, subtitle, illustration, children }) {
  return (
    <div className="s-auth">
      <header className="s-header">
        <div className="s-header-row">
          <span className="s-logo">
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" width="52" height="52" />
            {CLINIC.short}
          </span>
          <span className="s-area">
            <Icon name="shield" strokeWidth={1.75} />
            Khu quản trị
          </span>
        </div>
      </header>
      <main className="s-main">
        <div className="s-card">
          <div className="s-intro">
            <h1>{title}</h1>
            {illustration}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
      <footer className="s-footer">
        <p>
          © {new Date().getFullYear()} Phòng khám {CLINIC.short}
        </p>
      </footer>
    </div>
  );
}

/** Hình bác sĩ trong vòng tròn xanh, theo prototype. */
function DoctorAvatar() {
  return (
    <span className="s-avatar">
      <svg width="136" height="136" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle className="s-fill" cx="48" cy="34" r="15" />
        <path d="M33.3 30h29.4" />
        <path d="M42 40q6 5 12 0" />
        <path className="s-fill" d="M8 100v-20a22 22 0 0 1 22-22h36a22 22 0 0 1 22 22v20" />
        <path d="M40 58l8 14 8-14" />
        <path d="M30 62v8a10 10 0 0 0 20 0v4" />
        <circle cx="30" cy="60" r="2.2" fill="currentColor" />
        <circle className="s-fill" cx="50" cy="78" r="3.5" />
        <path d="M68 74h8M72 70v8" stroke="var(--gold-500)" strokeWidth="3" />
      </svg>
    </span>
  );
}

/** Tiếp tân và Admin đăng nhập bằng số điện thoại hoặc email và mật khẩu (BR.06). */
export default function StaffLogin() {
  useDocumentTitle('Đăng nhập nội bộ');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    <StaffShell title="Đăng nhập" illustration={<DoctorAvatar />} subtitle="Dùng số điện thoại hoặc email của tài khoản, cùng với mật khẩu.">
      <form className="s-form" onSubmit={submit} noValidate>
        <TextInput
          label="Số điện thoại hoặc email"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={error?.fields?.identifier}
        />
        <Field label="Mật khẩu" error={error?.fields?.password}>
          {(a11y) => (
            <div className="s-pw">
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...a11y}
              />
              <button type="button" className="s-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <Icon name="eye" size={22} strokeWidth={1.75} />
                {showPw ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          )}
        </Field>
        {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
        <Button type="submit" size="lg" block loading={pending} icon="login">
          Đăng nhập
        </Button>
        <p className="s-help">
          Quên mật khẩu? Liên hệ quản trị viên để được cấp mật khẩu tạm. <a href={USER_URL}>Về trang chủ</a>
        </p>
      </form>
    </StaffShell>
  );
}
