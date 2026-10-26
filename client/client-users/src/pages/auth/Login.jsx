import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { ErrorAlert } from '@chuctu/shared/components/ui.jsx';
import { api } from '@chuctu/shared/lib/api.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AuthShell, ClinicPhoto, PhoneField, phoneDigits, phoneError, toPhone } from './AuthShell.jsx';
import { OtpDialog } from './OtpDialog.jsx';

/** Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài. */
export function safeNext(value, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

/** Giữ lại trang cần quay về khi chuyển giữa đăng nhập và tạo tài khoản. */
export const withNext = (path, next, extra = {}) => {
  const q = new URLSearchParams(extra);
  if (next !== '/') q.set('tiep', next);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
};

export default function Login() {
  useDocumentTitle('Đăng nhập');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));
  const forBooking = next.startsWith('/dat-lich');

  const [digits, setDigits] = useState(() => phoneDigits(params.get('sdt') || ''));
  const [tried, setTried] = useState(false);
  const [otp, setOtp] = useState(null);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [codeError, setCodeError] = useState(null);

  if (user?.role === 'USER' && !otp) return <Navigate to={next} replace />;

  const phone = toPhone(digits);
  const localError = tried ? phoneError(digits) : null;

  const submitPhone = async (e) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (phoneError(digits)) return;
    setPending(true);
    try {
      const res = await api.post('/auth/login', { phone });
      if (!res.needCode) {
        setUser(res.user);
        navigate(next, { replace: true });
        return;
      }
      setCodeError(null);
      setOtp(res);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (code) => {
    setPending(true);
    setCodeError(null);
    try {
      const res = await api.post('/auth/login/verify', { phone, code, remember });
      setUser(res.user);
      navigate(next, { replace: true });
    } catch (err) {
      setCodeError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell switchText="Chưa có tài khoản?" switchLabel="Tạo tài khoản" switchTo={withNext('/dang-ky', next)} aside={<ClinicPhoto framed />}>
      <div>
        <h1 className="a-title">Đăng nhập</h1>
        <p className="a-lead">
          {forBooking
            ? 'Cô chú đăng nhập để đặt lịch khám. Chỉ cần số điện thoại đã đăng ký rồi bấm Đăng nhập.'
            : 'Cô chú chỉ cần nhập số điện thoại đã đăng ký rồi bấm Đăng nhập.'}
        </p>
      </div>

      <form className="a-form" onSubmit={submitPhone} noValidate>
        <PhoneField
          id="dn-sdt"
          label="Số điện thoại"
          value={digits}
          onChange={setDigits}
          error={localError || error?.fields?.phone}
          note="Không cần nhớ mật khẩu. Máy đã từng đăng nhập sẽ vào thẳng; máy mới sẽ nhận một mã xác nhận qua tin nhắn (tối đa 3 mã mỗi giờ)."
        />

        {error && !error.fields?.phone && (
          <>
            <ErrorAlert error={error} />
            {error.status === 404 && (
              <Link className="a-btn-ghost a-btn-block" to={withNext('/dang-ky', next, { sdt: digits })}>
                <Icon name="userPlus" strokeWidth={1.75} />
                Tạo tài khoản với số này
              </Link>
            )}
          </>
        )}

        <button type="submit" className="a-btn-primary" disabled={pending} aria-busy={pending || undefined}>
          {pending && !otp ? <span className="spinner" aria-hidden="true" /> : <Icon name="login" strokeWidth={1.75} />}
          Đăng nhập
        </button>
      </form>

      <p className="a-lead">
        Chưa có tài khoản? <Link to={withNext('/dang-ky', next)}>Tạo tài khoản mới</Link>
      </p>

      {otp && (
        <OtpDialog
          phone={phone}
          purpose="NEW_DEVICE"
          otp={otp}
          intro="Đây là máy mới nên phòng khám cần xác nhận lại."
          submitLabel="Xác nhận và đăng nhập"
          submitIcon="login"
          backLabel="Nhập lại số điện thoại"
          onSubmit={submitCode}
          onClose={() => setOtp(null)}
          pending={pending}
          error={codeError}
          remember={remember}
          setRemember={setRemember}
        />
      )}
    </AuthShell>
  );
}
