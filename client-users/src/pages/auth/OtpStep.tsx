import type { ApiError } from '@chuctu/shared/lib/api.ts';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@chuctu/shared/components/Icon.tsx';
import { api } from '@chuctu/shared/lib/api.ts';
import { CLINIC } from '@chuctu/shared/lib/format.ts';
import type { OtpInfo } from '@chuctu/shared/types.ts';
import { Spinner, UDialog, UError } from '../../components/uparts.tsx';

/** Hộp thoại nhập mã 6 số gửi qua tin nhắn; có đếm ngược gửi lại mã (BR.03). */
interface OtpDialogProps {
  phone: string;
  purpose: 'REGISTER' | 'NEW_DEVICE';
  otp: OtpInfo | null;
  intro: ReactNode;
  submitLabel: string;
  backLabel: string;
  onSubmit: (code: string) => void;
  pending: boolean;
  error: ApiError | null;
  onBack: () => void;
  remember?: boolean;
  setRemember?: (value: boolean) => void;
}

export function OtpDialog({ phone, purpose, otp, intro, submitLabel, backLabel, onSubmit, pending, error, onBack, remember, setRemember }: OtpDialogProps) {
  const id = useId();
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(otp?.resendAfterSeconds ?? 60);
  const [info, setInfo] = useState(otp);
  const [resendError, setResendError] = useState<ApiError | null>(null);
  const [resending, setResending] = useState(false);
  const [tried, setTried] = useState(false);

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
    setTried(true);
    if (code.length === 6) onSubmit(code);
  };

  const codeError = error?.fields?.code || (tried && code.length !== 6 ? 'Cô chú nhập đủ 6 số trong tin nhắn.' : null);

  return (
    <UDialog title="Nhập mã xác nhận" onClose={onBack}>
      <form className="u-stack" onSubmit={submit} noValidate>
        <p className="u-text">{intro}</p>
        {info?.devCode && (
          <p className="u-ok" style={{ padding: '14px 18px', fontSize: 17 }}>
            Chế độ phát triển: chưa nối dịch vụ tin nhắn, mã là <strong className="mono">{info.devCode}</strong>.
          </p>
        )}
        <div className="u-field">
          <label className="u-label" htmlFor={id}>
            Mã xác nhận (6 số)
          </label>
          <input
            id={id}
            className="u-input u-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="······"
            value={code}
            aria-invalid={!!codeError}
            aria-describedby={`${id}-note`}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <UError>{codeError}</UError>
          <p className="u-hint" id={`${id}-note`}>
            Tin nhắn thường đến trong vài giây. Điện thoại có thể tự điền mã giúp cô chú.
          </p>
        </div>
        <div className="u-check" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', cursor: 'default', padding: '16px 20px' }}>
          <span>{wait > 0 ? <>Gửi lại mã sau <strong>{wait} giây</strong></> : 'Chưa nhận được mã?'}</span>
          <button type="button" className={`u-btn u-btn-md ${wait > 0 ? '' : 'u-btn-ghost'}`} style={{ minHeight: 52 }} disabled={wait > 0 || resending} onClick={resend}>
            {resending && <Spinner />}
            Gửi lại mã
          </button>
        </div>
        <UError>{resendError?.message}</UError>
        {setRemember ? (
          <label className="u-check" style={{ background: 'transparent', padding: 0 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>
              <strong>Giữ đăng nhập trên máy này.</strong> Lần sau cô chú không cần nhập mã.
            </span>
          </label>
        ) : (
          <p className="u-hint">
            Không nhận được tin nhắn? Cô chú gọi{' '}
            <a href={CLINIC.phoneHref} className="u-link">
              {CLINIC.phone}
            </a>{' '}
            để phòng khám giúp. Mỗi số điện thoại nhận tối đa 3 mã mỗi giờ.
          </p>
        )}
        {error && !error.fields?.code && <UError>{error.message}</UError>}
        <button type="submit" className="u-btn u-btn-primary u-btn-lg u-btn-block" disabled={pending}>
          {pending ? <Spinner /> : <Icon name="check" />}
          {submitLabel}
        </button>
        <button type="button" className="u-btn u-btn-ghost u-btn-block" onClick={onBack}>
          {backLabel}
        </button>
      </form>
    </UDialog>
  );
}
