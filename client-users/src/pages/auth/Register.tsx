import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ErrorAlert, SelectInput, TextInput, type InputEvent } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { GENDERS, todayVN } from '@chuctu/shared/lib/format.ts';
import { useSession } from '@chuctu/shared/lib/session.tsx';
import { useDocumentTitle } from '@chuctu/shared/lib/useAsync.ts';
import { AuthShell } from './AuthShell.tsx';
import { safeNext } from './Login.tsx';
import { OtpStep } from './OtpStep.tsx';
import type { User, OtpInfo } from '@chuctu/shared/types.ts';

const EMPTY = { fullName: '', phone: '', dob: '', gender: '', address: '' };

export default function Register() {
  useDocumentTitle('Tạo tài khoản');
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('tiep'));

  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [otp, setOtp] = useState<OtpInfo | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const set = (k: keyof typeof form) => (e: InputEvent) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fields || {};

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      setOtp(await api.post<OtpInfo>('/auth/register', form));
      setStep('code');
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
      const res = await api.post<{ user: User }>('/auth/register/verify', { phone: form.phone, code });
      setUser(res.user);
      navigate(next === '/' ? '/tai-khoan/ho-so?moi=1' : next, { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      title={step === 'form' ? 'Tạo tài khoản' : 'Xác nhận số điện thoại'}
      subtitle={step === 'form' ? 'Điền một lần, lần sau đặt lịch khỏi nhập lại. Không cần mật khẩu.' : null}
      aside={
        <div className="card stack-sm">
          <h3>Đã có tài khoản?</h3>
          <p>
            <Link to={`/dang-nhap${next !== '/' ? `?tiep=${encodeURIComponent(next)}` : ''}`}>Đăng nhập bằng số điện thoại</Link>
          </p>
        </div>
      }
    >
      {step === 'form' ? (
        <form className="stack" onSubmit={submitForm} noValidate>
          <fieldset className="stack">
            <legend className="h4" style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink-900)', marginBottom: 8 }}>
              Thông tin của cô chú
            </legend>
            <TextInput label="Họ và tên" required autoComplete="name" placeholder="Ví dụ: Nguyễn Thị Hoa" value={form.fullName} onChange={set('fullName')} error={fe.fullName} />
            <TextInput
              label="Số điện thoại"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="Dùng để đăng nhập và nhận mã xác nhận."
              placeholder="Ví dụ: 0912 345 678"
              value={form.phone}
              onChange={set('phone')}
              error={fe.phone}
            />
            <div className="form-grid">
              <TextInput label="Ngày sinh" required type="date" max={todayVN()} value={form.dob} onChange={set('dob')} error={fe.dob} />
              <SelectInput
                label="Giới tính"
                required
                placeholder="Chọn giới tính"
                options={Object.entries(GENDERS).map(([value, label]) => ({ value, label }))}
                value={form.gender}
                onChange={set('gender')}
                error={fe.gender}
              />
            </div>
            <TextInput label="Địa chỉ" autoComplete="street-address" placeholder="Số nhà, đường, phường, quận" value={form.address} onChange={set('address')} error={fe.address} />
          </fieldset>
          {error && !Object.keys(fe).length && <ErrorAlert error={error} />}
          {error?.code === 'PHONE_TAKEN' && (
            <p>
              <Link to="/dang-nhap">Đăng nhập với số điện thoại này</Link>
            </p>
          )}
          <Button type="submit" size="lg" block loading={pending}>
            Gửi mã xác nhận
          </Button>
        </form>
      ) : (
        <OtpStep
          phone={form.phone}
          purpose="REGISTER"
          otp={otp}
          pending={pending}
          error={error}
          onSubmit={submitCode}
          onBack={() => {
            setStep('form');
            setError(null);
          }}
        />
      )}
    </AuthShell>
  );
}
