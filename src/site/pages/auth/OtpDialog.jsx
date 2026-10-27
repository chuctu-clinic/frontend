import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/components/Icon.jsx';
import { Alert, ErrorAlert } from '../../../shared/components/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { CLINIC } from '../../../shared/lib/format.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { FieldError } from './AuthShell.jsx';
import { confirmFirebaseCode, sendFirebaseCode } from './firebasePhone.js';

/** 0912345678 → "0912 *** 678" */
const maskPhone = (p) => (p.length >= 8 ? `${p.slice(0, 4)} *** ${p.slice(-3)}` : p);

/**
 * Hộp thoại nhập mã 6 số gửi qua tin nhắn, có đếm ngược gửi lại mã (BR.03).
 * Dùng chung cho đăng nhập trên máy mới và tạo tài khoản.
 * onSubmit nhận { code } (server tự gửi mã) hoặc { idToken } (gửi mã qua Firebase).
 */
export function OtpDialog({ phone, purpose, otp, intro, outro, submitLabel, submitIcon, backLabel, onSubmit, onClose, pending, error, remember, setRemember }) {
  const { meta } = useSession();
  const firebaseCfg = otp?.provider === 'firebase' ? meta?.otp?.firebase : null;
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(otp?.resendAfterSeconds ?? 60);
  const [info, setInfo] = useState(otp);
  const [resendError, setResendError] = useState(null);
  const [resending, setResending] = useState(false);
  const [tried, setTried] = useState(false);
  // Firebase: đang gửi tin, đang xác nhận mã, lỗi phía Firebase
  const [sending, setSending] = useState(Boolean(firebaseCfg));
  const [confirming, setConfirming] = useState(false);
  const [fbError, setFbError] = useState(null);
  const [fbSent, setFbSent] = useState(false);
  const sentRef = useRef(null);
  const startedRef = useRef(false);
  const captchaRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  /** Firebase: gửi tin nhắn có mã (trình duyệt gửi, kèm reCAPTCHA ẩn). */
  const sendViaFirebase = async () => {
    setSending(true);
    setFbError(null);
    setFbSent(false);
    sentRef.current?.clear();
    sentRef.current = null;
    try {
      sentRef.current = await sendFirebaseCode(firebaseCfg, phone, captchaRef.current);
      setFbSent(true);
    } catch (err) {
      setFbError(err);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // Chỉ gửi một lần khi mở hộp thoại (StrictMode chạy effect hai lần; lần hai sẽ phá reCAPTCHA của lần đầu)
    if (startedRef.current) return undefined;
    startedRef.current = true;
    if (otp?.provider === 'firebase' && !firebaseCfg) {
      setSending(false);
      setFbError(new Error('Phòng khám chưa cấu hình gửi mã qua tin nhắn. Cô chú gọi phòng khám để được giúp.'));
      return undefined;
    }
    if (firebaseCfg) sendViaFirebase();
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Đóng hộp thoại thì dọn reCAPTCHA
  useEffect(() => () => sentRef.current?.clear(), []);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Mở hộp thoại: đặt con trỏ vào ô mã, khoá cuộn trang; đóng thì trả con trỏ về chỗ cũ
  useEffect(() => {
    const prev = document.activeElement;
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    // Giữ phím Tab trong hộp thoại
    const items = dialogRef.current.querySelectorAll('button:not([disabled]), input, a[href]');
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const resend = async () => {
    setResending(true);
    setResendError(null);
    try {
      // Server ghi nhận lần xin mã (giới hạn 3 mã mỗi giờ); với Firebase thì trình duyệt gửi tin sau đó
      const res = await api.post('/auth/otp/resend', { phone, purpose });
      setInfo(res);
      setWait(res.resendAfterSeconds ?? 60);
      setCode('');
      if (firebaseCfg) await sendViaFirebase();
      inputRef.current?.focus();
    } catch (err) {
      setResendError(err);
      if (err.data?.retryAfter) setWait(err.data.retryAfter);
    } finally {
      setResending(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setTried(true);
    if (code.length !== 6) {
      inputRef.current?.focus();
      return;
    }
    if (!firebaseCfg) {
      onSubmit({ code });
      return;
    }
    if (!sentRef.current) {
      setFbError(new Error('Mã chưa được gửi. Cô chú bấm "Gửi lại mã".'));
      return;
    }
    setConfirming(true);
    setFbError(null);
    try {
      const idToken = await confirmFirebaseCode(firebaseCfg, sentRef.current, code);
      onSubmit({ idToken });
    } catch (err) {
      setFbError(err);
      inputRef.current?.focus();
    } finally {
      setConfirming(false);
    }
  };

  const codeError = (tried && code.length !== 6 ? 'Mã xác nhận gồm 6 chữ số.' : null) || fbError?.fields?.code || error?.fields?.code;
  const busy = pending || confirming;

  // Gắn thẳng vào <body> để luôn nằm giữa màn hình (xem components/Dialog.jsx)
  return createPortal(
    <div className="a-dialog-backdrop a-vars">
      <div className="a-dialog" role="dialog" aria-modal="true" aria-labelledby="otp-title" ref={dialogRef} onKeyDown={onKeyDown}>
        <div className="a-dialog-head">
          <h2 id="otp-title">Nhập mã xác nhận</h2>
          <button type="button" className="a-dialog-close" onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <form className="a-dialog-body" onSubmit={submit} noValidate>
          <p className="a-lead" aria-live="polite">
            {intro && `${intro} `}
            {sending
              ? 'Phòng khám đang gửi tin nhắn có mã 6 số tới số '
              : firebaseCfg && !fbSent
                ? 'Phòng khám chưa gửi được mã tới số '
                : 'Phòng khám vừa gửi tin nhắn có mã 6 số tới số '}
            <strong>{maskPhone(phone)}</strong>
            {sending ? '…' : '.'}
            {outro && !sending && (!firebaseCfg || fbSent) && ` ${outro}`}
          </p>
          {/* Chỗ gắn reCAPTCHA ẩn của Firebase */}
          <div ref={captchaRef} />
          {fbError && !fbError.fields?.code && <ErrorAlert error={fbError} />}
          {info?.devCode && (
            <Alert type="success" title="Chế độ phát triển">
              Chưa nối dịch vụ tin nhắn, mã xác nhận là <strong className="mono">{info.devCode}</strong>.
            </Alert>
          )}
          <div className="a-field">
            <label htmlFor="otp-code" className="a-label">
              Mã xác nhận (6 số)
            </label>
            <input
              ref={inputRef}
              id="otp-code"
              className="a-input a-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={codeError ? 'true' : 'false'}
              aria-describedby={codeError ? 'otp-code-loi otp-code-note' : 'otp-code-note'}
            />
            <FieldError id="otp-code-loi">{codeError}</FieldError>
            <p id="otp-code-note" className="a-hint">
              Tin nhắn thường đến trong vài giây. Mã dùng được trong 5 phút. Điện thoại có thể tự điền mã giúp cô chú.
            </p>
          </div>

          <div className="a-resend">
            <span aria-live="polite">
              {wait > 0 ? (
                <>
                  Gửi lại mã sau <strong>{wait} giây</strong>
                </>
              ) : (
                'Chưa nhận được mã?'
              )}
            </span>
            <button type="button" className="a-btn-ghost" onClick={resend} disabled={wait > 0 || resending}>
              {resending ? 'Đang gửi…' : 'Gửi lại mã'}
            </button>
          </div>
          <ErrorAlert error={resendError} />

          {setRemember ? (
            <label className="a-check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                <strong>Giữ đăng nhập trên máy này.</strong> Lần sau cô chú không cần nhập mã.
              </span>
            </label>
          ) : (
            <p className="a-hint">
              Không nhận được tin nhắn? Cô chú gọi{' '}
              <a className="a-link" href={CLINIC.phoneHref}>
                {CLINIC.phone}
              </a>{' '}
              để phòng khám giúp. Mỗi số điện thoại nhận tối đa 3 mã mỗi giờ.
            </p>
          )}

          {error && !error.fields?.code && <ErrorAlert error={error} />}

          <button type="submit" className="a-btn-primary" disabled={busy || sending} aria-busy={busy || undefined}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name={submitIcon} strokeWidth={1.75} />}
            {submitLabel}
          </button>
          <button type="button" className="a-btn-ghost a-btn-block" onClick={onClose}>
            {backLabel}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
