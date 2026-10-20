import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { OtpDialog } from './OtpStep.tsx';
import { PhoneField, Spinner, UError, phoneOk, toPhone } from '../../components/uparts.tsx';
import type { User, OtpInfo } from '@chuctu/shared/types.ts';

/** Chỉ nhận đường dẫn nội bộ để tránh chuyển hướng ra ngoài. */
export function safeNext(value: string | null | undefined, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

/** "0912345678" → "0912 *** 678" để nhắc số vừa nhận mã mà không lộ cả số. */
const masked = (phone: string) => (phone.length >= 8 ? `${phone.slice(0, 4)} *** ${phone.slice(-3)}` : phone);

export default function Login() {
  useDocumentTitle('Đăng nhập');
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));
  const forBooking = next.startsWith('/dat-lich');

  const [digits, setDigits] = useState('');
  const [tried, setTried] = useState(false);
  const [otp, setOtp] = useState<OtpInfo | null>(null);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  if (user?.role === 'USER' && !otp) return <Navigate to={next} replace />;

  const phone = toPhone(digits);
  const localError = tried && !phoneOk(digits) ? (digits ? 'Số điện thoại gồm 9 đến 10 chữ số sau +84.' : 'Vui lòng nhập số điện thoại.') : null;

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!phoneOk(digits)) return;
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ needCode: false; user: User } | ({ needCode: true } & OtpInfo)>('/auth/login', { phone });
      if (!res.needCode) {
        setUser(res.user);
        navigate(next, { replace: true });
        return;
      }
      setOtp(res);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const submitCode = async (code: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>('/auth/login/verify', { phone, code, remember });
      setUser(res.user);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  const registerLink = `/dang-ky${next !== '/' ? `?tiep=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="u-auth-grid">
      <div className="u-auth-side">
        <img className="u-auth-photo" src="/mat-tien.jpg" alt="Mặt tiền Phòng khám Chúc Từ, 57/8-10 Điện Biên Phủ" />
      </div>
      <form className="u-auth-form u-card-lg" onSubmit={submitPhone} noValidate>
        <div>
          <h1>Đăng nhập</h1>
          <p className="u-text">
            {forBooking
              ? 'Cô chú đăng nhập để đặt lịch khám. Chỉ cần nhập số điện thoại đã đăng ký rồi bấm Đăng nhập.'
              : 'Cô chú chỉ cần nhập số điện thoại đã đăng ký rồi bấm Đăng nhập.'}
          </p>
        </div>
        <PhoneField
          label="Số điện thoại"
          value={digits}
          onChange={(d) => {
            setDigits(d);
            setError(null);
          }}
          error={localError || error?.fields?.phone}
          hint="Không cần nhớ mật khẩu. Máy đã đăng nhập trước đây sẽ vào thẳng; máy mới sẽ nhận mã xác nhận qua tin nhắn (tối đa 3 mã mỗi giờ)."
        />
        {error && !error.fields?.phone && !otp && (
          <div className="u-stack" style={{ gap: 12 }}>
            <UError>{error.message}</UError>
            {error.status === 404 && (
              <Link to={registerLink} className="u-btn u-btn-ghost">
                Tạo tài khoản với số này
              </Link>
            )}
          </div>
        )}
        <button type="submit" className="u-btn u-btn-primary u-btn-lg u-btn-block" disabled={pending && !otp}>
          {pending && !otp ? <Spinner /> : <Icon name="login" />}
          Đăng nhập
        </button>
        <p className="u-text">
          Chưa có tài khoản?{' '}
          <Link to={registerLink} className="u-link">
            Tạo tài khoản mới
          </Link>
        </p>
      </form>
      {otp && (
        <OtpDialog
          phone={phone}
          purpose="NEW_DEVICE"
          otp={otp}
          intro={
            <>
              Đây là máy mới nên phòng khám cần xác nhận lại. Phòng khám vừa gửi tin nhắn có mã 6 số tới số <strong className="u-ink">{masked(phone)}</strong>.
            </>
          }
          submitLabel="Xác nhận và đăng nhập"
          backLabel="Nhập lại số điện thoại"
          pending={pending}
          error={error}
          onSubmit={submitCode}
          onBack={() => {
            setOtp(null);
            setError(null);
          }}
          remember={remember}
          setRemember={setRemember}
        />
      )}
    </div>
  );
}
