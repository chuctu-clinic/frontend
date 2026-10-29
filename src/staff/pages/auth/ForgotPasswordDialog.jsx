import { useState } from 'react';
import { Dialog } from '../../../site/components/Dialog.jsx';
import { FieldError } from '../../../site/components/fields.jsx';
import { AccountNameHint } from '../../components/fields.jsx';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { api } from '../../../shared/lib/api.js';
import { MIN_PASSWORD_LENGTH } from '../../lib/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(email) {
  if (!email.trim()) return 'Vui lòng nhập email.';
  return EMAIL_RE.test(email.trim()) ? null : 'Email chưa đúng, ví dụ ten@email.com.';
}

/** Ô mật khẩu có nút hiện / ẩn vuông bên cạnh (theo prototype). */
function PasswordInput({ id, label, value, onChange, error }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="a-field">
      <label htmlFor={id} className="a-label">
        {label}
      </label>
      <div className="s-pw-row">
        <input
          id={id}
          className="a-input s-pw-input"
          type={shown ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-loi` : undefined}
        />
        <button type="button" className="s-pw-eye" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label="Hiện hoặc ẩn mật khẩu" title="Hiện / ẩn mật khẩu">
          <Icon name={shown ? 'eyeOff' : 'eye'} size={24} strokeWidth={1.9} />
        </button>
      </div>
      <FieldError id={`${id}-loi`}>{error}</FieldError>
    </div>
  );
}

/** Bước 1: nhập email, gửi mã; gửi xong mới hiện ô mã xác nhận (sửa email thì ẩn lại). */
function CodeStep({ onVerified, onClose }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [code, setCode] = useState('');
  const [emailErr, setEmailErr] = useState(null);
  const [codeErr, setCodeErr] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendCode = async () => {
    const err = emailError(email);
    if (err) {
      setEmailErr(err);
      return;
    }
    setSending(true);
    setEmailErr(null);
    setCodeErr(null);
    try {
      const res = await api.post('/auth/staff/forgot-password', { email: email.trim() });
      setSent(res);
      setCode('');
    } catch (e) {
      setEmailErr(e.fields?.email || e.message);
    } finally {
      setSending(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    // Chưa gửi mã thì Enter ở ô email nghĩa là gửi mã
    if (!sent) return sendCode();
    if (code.length < 6) return setCodeErr('Vui lòng nhập đủ 6 số.');
    setVerifying(true);
    setCodeErr(null);
    try {
      const res = await api.post('/auth/staff/forgot-password/verify', { email: sent.email, code });
      onVerified({ token: res.resetToken, email: sent.email });
    } catch (err) {
      setCodeErr(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog title="Quên mật khẩu" width={520} onClose={onClose}>
      <form className="a-form" onSubmit={confirm} noValidate>
        <p className="a-lead">Nhập email của tài khoản. Hệ thống sẽ gửi mã 6 số tới email này.</p>
        <div className="a-field">
          <label htmlFor="fp-email" className="a-label">
            Email
          </label>
          <div className="s-send-row">
            <input
              id="fp-email"
              className="a-input"
              type="email"
              autoComplete="off"
              placeholder="ten@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailErr(null);
                setSent(null);
                setCodeErr(null);
              }}
              aria-invalid={emailErr ? 'true' : 'false'}
              aria-describedby={emailErr ? 'fp-email-loi' : undefined}
            />
            <button type="button" className="a-btn-primary s-send-btn" onClick={sendCode} disabled={sending} aria-busy={sending || undefined}>
              {sent ? 'Gửi lại mã' : 'Gửi mã'}
            </button>
          </div>
          <FieldError id="fp-email-loi">{emailErr}</FieldError>
          {sent && !emailErr && (
            <p className="s-sent" role="status">
              <Icon name="checkCircle" size={22} />
              <span>Đã gửi mã tới {sent.email}.</span>
            </p>
          )}
          {sent?.devCode && (
            <p className="a-hint">
              Chưa nối dịch vụ gửi email, mã xác nhận là <strong className="mono">{sent.devCode}</strong>.
            </p>
          )}
        </div>
        {sent && (
          <>
            <div className="a-field">
              <label htmlFor="fp-otp" className="a-label">
                Mã xác nhận (6 số)
              </label>
              <input
                id="fp-otp"
                className="a-input a-otp"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                pattern="[0-9]*"
                placeholder="······"
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setCodeErr(null);
                }}
                aria-invalid={codeErr ? 'true' : 'false'}
                aria-describedby={codeErr ? 'fp-otp-loi' : undefined}
              />
              <FieldError id="fp-otp-loi">{codeErr}</FieldError>
            </div>
            <button type="submit" className="a-btn-primary a-btn-block" disabled={verifying} aria-busy={verifying || undefined}>
              Xác nhận
            </button>
          </>
        )}
      </form>
    </Dialog>
  );
}

/** Bước 2: đặt mật khẩu mới bằng token nhận được sau khi mã đúng. */
function NewPasswordStep({ token, email, onDone, onClose }) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [tried, setTried] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [pending, setPending] = useState(false);

  const short = form.password.length < MIN_PASSWORD_LENGTH;
  const errM = (tried && short ? `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.` : null) || serverErr?.fields?.newPassword;
  const errN = tried && !short && form.confirm !== form.password ? 'Hai mật khẩu chưa giống nhau.' : null;
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setServerErr(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (short || form.confirm !== form.password) {
      setTried(true);
      return;
    }
    setPending(true);
    setServerErr(null);
    try {
      await api.post('/auth/staff/reset-password', { token, newPassword: form.password });
      onDone();
    } catch (err) {
      setServerErr(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog title="Mật khẩu mới" width={520} onClose={onClose}>
      <form className="a-form" onSubmit={submit} noValidate>
        <p className="a-lead">Mã đã đúng. Đặt mật khẩu mới cho tài khoản.</p>
        <AccountNameHint value={email} />
        <PasswordInput id="fp-mk" label="Nhập mật khẩu mới" value={form.password} onChange={set('password')} error={errM} />
        <PasswordInput id="fp-nhap" label="Nhập lại mật khẩu mới" value={form.confirm} onChange={set('confirm')} error={errN} />
        {serverErr && !serverErr.fields?.newPassword && <FieldError id="fp-loi">{serverErr.message}</FieldError>}
        <button type="submit" className="a-btn-primary a-btn-block" disabled={pending} aria-busy={pending || undefined}>
          Đổi mật khẩu
        </button>
      </form>
    </Dialog>
  );
}

/** Quên mật khẩu tài khoản nội bộ (theo prototype "NoiBo-DangNhap"): email → mã 6 số → mật khẩu mới. */
export function ForgotPasswordDialog({ onDone, onClose }) {
  const [verified, setVerified] = useState(null);
  return verified ? (
    <NewPasswordStep token={verified.token} email={verified.email} onDone={onDone} onClose={onClose} />
  ) : (
    <CodeStep onVerified={setVerified} onClose={onClose} />
  );
}
