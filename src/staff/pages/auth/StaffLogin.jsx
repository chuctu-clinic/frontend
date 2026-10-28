import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { Alert, Button, ErrorAlert, Field, TextInput } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC } from '../../../shared/lib/format.js';
import { isStaff, useSession } from '../../../shared/lib/session.jsx';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';
import './staff-auth.css';

import { homeFor } from '../../lib/home.js';
import { ForgotPasswordDialog } from './ForgotPasswordDialog.jsx';

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
  const [forgot, setForgot] = useState(false);
  const [resetDone, setResetDone] = useState(false);

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
        {user?.role === 'USER' && (
          <Alert>Cô chú đang đăng nhập tài khoản khách {user.fullName}. Đăng nhập nội bộ sẽ đăng xuất tài khoản này.</Alert>
        )}
        {resetDone && (
          <Alert type="success">Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.</Alert>
        )}
        <TextInput
          label="Số điện thoại hoặc email"
          autoComplete="off"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setResetDone(false);
                }}
                {...a11y}
              />
              <button type="button" className="s-pw-toggle" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <Icon name="eye" size={22} strokeWidth={1.75} />
                {showPw ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          )}
        </Field>
        <div className="s-forgot">
          <button
            type="button"
            className="s-forgot-link"
            onClick={() => {
              setForgot(true);
              setResetDone(false);
            }}
          >
            Quên mật khẩu?
          </button>
        </div>
        {error && !Object.keys(error.fields || {}).length && <ErrorAlert error={error} />}
        <Button type="submit" size="lg" block loading={pending} icon="login">
          Đăng nhập
        </Button>
        <p className="s-help">
          <Link to="/">Về trang chủ</Link>
        </p>
      </form>
      {forgot && (
        <ForgotPasswordDialog
          onClose={() => setForgot(false)}
          onDone={() => {
            setForgot(false);
            setPassword('');
            setShowPw(false);
            setError(null);
            setResetDone(true);
          }}
        />
      )}
    </StaffShell>
  );
}
