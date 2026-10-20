import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@chuctu/shared/components/Icon.tsx';
import { USER_URL } from '@chuctu/shared/lib/apps.ts';
import { api, type ApiError } from '@chuctu/shared/lib/api.ts';
import { isStaff, useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import type { User } from '@chuctu/shared/types.ts';
import { NbError, NbField } from '../../components/nb.tsx';

export const homeFor = (user: User) => (user.mustChangePassword ? '/doi-mat-khau' : user.role === 'ADMIN' ? '/quan-tri' : '/lich-trong-ngay');

/** Khung trang đăng nhập và đổi mật khẩu của khu nội bộ (prototype: Đăng nhập khu nội bộ). */
export function StaffShell({ title, intro, icon = 'lock', children }: { title: ReactNode; intro?: ReactNode; icon?: IconName; children: ReactNode }) {
  return (
    <div className="nb-page">
      <header className="nb-auth-header">
        <div>
          <a href={USER_URL} className="nb-row" style={{ gap: 12, textDecoration: 'none' }} aria-label="Về trang chủ Phòng khám Chúc Từ">
            <img src={`${import.meta.env.BASE_URL}logo-192.png`} alt="" width={52} height={52} />
            <span className="brand-t">Chúc Từ</span>
          </a>
          <span className="area">
            <Icon name="shield" />
            <span>Khu nội bộ</span>
          </span>
        </div>
      </header>
      <main className="nb-auth-body">
        <div className="nb-auth-card">
          <div className="intro">
            <h1>{title}</h1>
            <span className="nb-auth-circle" aria-hidden="true">
              <Icon name={icon} size={64} strokeWidth={1.75} />
            </span>
            {intro && <p>{intro}</p>}
          </div>
          {children}
        </div>
      </main>
      <footer className="nb-auth-footer">
        <p>© {new Date().getFullYear()} Phòng khám Chúc Từ</p>
      </footer>
    </div>
  );
}

/** Ô mật khẩu có nút Hiện/Ẩn. */
export function PasswordInput({ value, onChange, autoComplete, ...a11y }: { value: string; onChange: (v: string) => void; autoComplete: string; id: string; 'aria-invalid'?: 'true'; 'aria-describedby'?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="nb-pw">
      <input className="nb-input" type={shown ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} {...a11y} />
      <button type="button" aria-pressed={shown} onClick={() => setShown((s) => !s)}>
        <Icon name="eye" size={22} />
        {shown ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
  );
}

/** Tiếp tân và Admin đăng nhập bằng số điện thoại hoặc email và mật khẩu (BR.06). */
export default function StaffLogin() {
  useDocumentTitle('Đăng nhập khu nội bộ');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (isStaff(user)) return <Navigate to={homeFor(user)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!identifier.trim()) fe.identifier = 'Vui lòng nhập số điện thoại hoặc email.';
    if (!password) fe.password = 'Vui lòng nhập mật khẩu.';
    setFields(fe);
    if (Object.keys(fe).length) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/staff/login', { identifier, password });
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
    <StaffShell title="Đăng nhập" intro="Dùng số điện thoại hoặc email của tài khoản, cùng với mật khẩu.">
      <form className="nb-stack" style={{ gap: 28 }} onSubmit={submit} noValidate>
        <div className="nb-stack" style={{ gap: 20 }}>
          <NbField label="Số điện thoại hoặc email" error={fields.identifier}>
            {(a) => <input className="nb-input" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} {...a} />}
          </NbField>
          <NbField label="Mật khẩu" error={fields.password}>
            {(a) => <PasswordInput autoComplete="current-password" value={password} onChange={setPassword} {...a} />}
          </NbField>
        </div>
        <NbError error={error && !Object.keys(error.fields).length ? error : null} />
        <button type="submit" className="nb-btn nb-btn-primary" disabled={pending}>
          <Icon name="login" />
          Đăng nhập
        </button>
        <p className="nb-hint" style={{ textAlign: 'center' }}>
          Quên mật khẩu? Liên hệ quản trị viên để được cấp mật khẩu tạm.
        </p>
      </form>
    </StaffShell>
  );
}
