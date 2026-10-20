import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { Alert, Button, ErrorAlert, TextInput } from '@chuctu/shared/components/ui.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC } from '@chuctu/shared/lib/format.ts';
import type { OtpInfo } from '@chuctu/shared/types.ts';

/** Bước nhập mã 6 số gửi qua tin nhắn; có đếm ngược gửi lại mã (BR.03). */
interface OtpStepProps {
  phone: string;
  purpose: 'REGISTER' | 'NEW_DEVICE';
  otp: OtpInfo | null;
  onSubmit: (code: string) => void;
  pending: boolean;
  error: ApiError | null;
  onBack: () => void;
  showRemember?: boolean;
  remember?: boolean;
  setRemember?: (value: boolean) => void;
}

export function OtpStep({ phone, purpose, otp, onSubmit, pending, error, onBack, showRemember, remember, setRemember }: OtpStepProps) {
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(otp?.resendAfterSeconds ?? 60);
  const [info, setInfo] = useState(otp);
  const [resendError, setResendError] = useState<ApiError | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    setResending(true);
    setResendError(null);
    try {
      const res = await api.post<OtpInfo>('/auth/otp/resend', { phone, purpose });
      setInfo(res);
      setWait(res.resendAfterSeconds ?? 60);
      setCode('');
    } catch (err) {
      setResendError(err as ApiError);
      const retryAfter = (err as ApiError).data?.retryAfter;
      if (typeof retryAfter === 'number') setWait(retryAfter);
    } finally {
      setResending(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(code);
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Alert type="info" title="Đã gửi mã xác nhận">
        Phòng khám vừa gửi tin nhắn có <strong>mã 6 số</strong> tới số <strong className="mono">{phone}</strong>. Mã dùng được trong 5 phút.
      </Alert>
      {info?.devCode && (
        <Alert type="success" title="Chế độ phát triển">
          Chưa nối dịch vụ tin nhắn, mã xác nhận là <strong className="mono">{info.devCode}</strong>.
        </Alert>
      )}
      <TextInput
        label="Mã xác nhận"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        className=""
        placeholder="______"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        error={error?.fields?.code}
        style={{ fontSize: 30, letterSpacing: '0.4em', textAlign: 'center' }}
      />
      {showRemember && (
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember?.(e.target.checked)} />
          Giữ đăng nhập trên máy này (lần sau không cần nhập mã)
        </label>
      )}
      {error && !error.fields?.code && <ErrorAlert error={error} />}
      <Button type="submit" size="lg" block loading={pending} disabled={code.length !== 6}>
        Xác nhận
      </Button>
      <div className="row-between">
        <Button variant="ghost" icon="arrowLeft" onClick={onBack}>
          Đổi số điện thoại
        </Button>
        <Button variant="ghost" icon="refresh" onClick={resend} disabled={wait > 0} loading={resending}>
          {wait > 0 ? `Gửi lại mã sau ${wait} giây` : 'Gửi lại mã'}
        </Button>
      </div>
      <ErrorAlert error={resendError} />
      <p className="small muted row" style={{ gap: 8 }}>
        <Icon name="phone" size={20} />
        Không nhận được tin nhắn? Cô chú gọi <a href={CLINIC.phoneHref}>{CLINIC.phone}</a> để được giúp.
      </p>
    </form>
  );
}
