import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.jsx';
import { Button, ButtonLink, ErrorAlert, TextInput } from '@chuctu/shared/components/ui.jsx';
import { adminUrl } from '@chuctu/shared/lib/apps.js';
import { api } from '@chuctu/shared/lib/api.js';
import { useSession } from '@chuctu/shared/lib/session.jsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.js';
import { AuthShell } from './AuthShell.jsx';
import { OtpStep } from './OtpStep.jsx';

/** Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài. */
export function safeNext(value, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

export default function Login() {
  useDocumentTitle('Đăng nhập');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));
  const forBooking = next.startsWith('/dat-lich');

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [otp, setOtp] = useState(null);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (user?.role === 'USER' && step === 'phone') return <Navigate to={next} replace />;

  const submitPhone = async (e) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { phone });
      if (!res.needCode) {
        setUser(res.user);
        navigate(next, { replace: true });
        return;
      }
      setOtp(res);
      setStep('code');
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (code) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/auth/login/verify', { phone, code, remember });
      setUser(res.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title={step === 'phone' ? 'Đăng nhập' : 'Nhập mã xác nhận'}
      subtitle={
        step === 'phone'
          ? forBooking
            ? 'Cô chú đăng nhập để đặt lịch khám. Chỉ cần số điện thoại, không cần mật khẩu.'
            : 'Chỉ cần số điện thoại, không cần nhớ mật khẩu.'
          : 'Máy này chưa từng đăng nhập nên cần xác nhận một lần.'
      }
      aside={
        <div className="card stack-sm">
          <h3>Chưa có tài khoản?</h3>
          <p>Tạo tài khoản một lần, lần sau đặt lịch khỏi nhập lại thông tin.</p>
          <ButtonLink to={`/dang-ky${forBooking ? `?tiep=${encodeURIComponent(next)}` : ''}`} variant="secondary" icon="user">
            Tạo tài khoản
          </ButtonLink>
        </div>
      }
    >
      {step === 'phone' ? (
        <form className="stack" onSubmit={submitPhone} noValidate>
          <TextInput
            label="Số điện thoại"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ví dụ: 0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error?.fields?.phone}
          />
          {error && !error.fields?.phone && (
            <>
              <ErrorAlert error={error} />
              {error.status === 404 && (
                <ButtonLink to="/dang-ky" variant="secondary">
                  Tạo tài khoản với số này
                </ButtonLink>
              )}
            </>
          )}
          <Button type="submit" size="lg" block loading={pending}>
            Đăng nhập
          </Button>
          <p className="small muted row" style={{ gap: 8 }}>
            <Icon name="shield" size={20} />
            Máy đã đăng nhập trước đây sẽ vào thẳng. Máy mới cần nhập mã 6 số gửi qua tin nhắn.
          </p>
          <p className="small">
            Nhân viên phòng khám? <a href={adminUrl('dang-nhap')}>Đăng nhập khu vực nội bộ</a>
          </p>
        </form>
      ) : (
        <OtpStep
          phone={phone}
          purpose="NEW_DEVICE"
          otp={otp}
          pending={pending}
          error={error}
          onSubmit={submitCode}
          onBack={() => {
            setStep('phone');
            setError(null);
          }}
          showRemember
          remember={remember}
          setRemember={setRemember}
        />
      )}
    </AuthShell>
  );
}
