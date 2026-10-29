import { useEffect, useState } from 'react';
import { api } from '../../../shared/lib/api.js';
import { fmtDate, ROLE_LABELS } from '../../../shared/lib/format.js';
import { useDocumentTitle } from '../../../shared/lib/hooks.js';
import { useSession } from '../../../shared/lib/session.jsx';
import { Icon } from '../../../shared/ui/Icon.jsx';
import { TDialog } from '../../components/dialogs.jsx';
import { AccountNameHint, FieldError, Notice, PasswordField } from '../../components/fields.jsx';
import { passwordErrors } from '../../lib/password.js';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

/** Ô chỉ xem, có biểu tượng khoá. */
function ReadOnly({ id, label, children }) {
  return (
    <div className="t-field">
      <span id={id} className="t-label">
        {label}
      </span>
      <div className="t-readonly t-readonly-lock" aria-labelledby={id}>
        <Icon name="lock" size={20} strokeWidth={1.75} />
        {children}
      </div>
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hộp thoại xác minh email mới bằng mã 6 số (theo prototype "TiepTan-TaiKhoan"). */
function EmailOtpDialog({ sent, onResent, onVerified, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(sent.resendAfterSeconds ?? 60);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await api.post('/staff/account/email', { email: sent.email });
      onResent(res);
      setCode('');
      setWait(res.resendAfterSeconds ?? 60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Mã gồm 6 chữ số. Vui lòng nhập đủ 6 số.');
    setPending(true);
    setError(null);
    try {
      const res = await api.post('/staff/account/email/verify', { code });
      onVerified(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <TDialog title="Xác minh email mới" width={520} onClose={onClose}>
      <form className="t-dialog-body" onSubmit={verify} noValidate>
        <p className="t-otp-lead">
          Hệ thống vừa gửi email có mã 6 số tới <strong>{sent.email}</strong>. Nhập mã đó để xác nhận email này là của bạn.
        </p>
        {sent.devCode && (
          <p className="t-tint-green">
            Chưa nối dịch vụ gửi email, mã xác nhận là <strong className="mono">{sent.devCode}</strong>.
          </p>
        )}
        <div className="t-field">
          <label htmlFor="otp-ma" className="t-label">
            Mã xác nhận (6 số)
          </label>
          <input
            id="otp-ma"
            className="t-input t-otp"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            pattern="[0-9]*"
            placeholder="······"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'otp-loi' : undefined}
          />
          <FieldError id="otp-loi">{error}</FieldError>
        </div>
        <div className="t-otp-resend">
          <span>
            {wait > 0 ? (
              <>
                Gửi lại mã sau <strong>{wait} giây</strong>
              </>
            ) : (
              'Chưa nhận được mã?'
            )}
          </span>
          <button type="button" className="t-btn t-btn-ghost" onClick={resend} disabled={wait > 0 || resending}>
            Gửi lại mã
          </button>
        </div>
        <button type="submit" className="t-btn t-btn-primary t-btn-lg t-btn-full" disabled={pending} aria-busy={pending || undefined}>
          Xác minh và lưu thay đổi
        </button>
        <button type="button" className="t-btn t-btn-ghost t-btn-lg t-btn-full" onClick={onClose}>
          Quay lại sửa thông tin
        </button>
      </form>
    </TDialog>
  );
}

/** Thông tin cá nhân: sửa họ tên và email (email mới phải xác minh bằng mã); số điện thoại, vai trò, ngày tạo để xem. */
function InfoForm({ user, setUser }) {
  const [form, setForm] = useState({ name: user.fullName, email: user.email || '' });
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(null);

  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const emailChanged = email !== (user.email || '');
  const nameError = (tried && name.length < 2 ? 'Vui lòng nhập họ và tên.' : null) || serverError?.fields?.fullName;
  const emailError =
    (tried && !EMAIL_RE.test(email) ? (email ? 'Email chưa đúng, ví dụ ten@email.com.' : 'Vui lòng nhập email.') : null) ||
    serverError?.fields?.email;
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setDone(false);
    setServerError(null);
  };

  // Lưu họ tên nếu có đổi; trả về tài khoản sau khi lưu (null nếu không đổi)
  const saveName = async () => {
    if (name === user.fullName) return null;
    const res = await api.patch('/staff/account', { fullName: name });
    setUser(res.user);
    return res.user;
  };

  const submit = async (e) => {
    e.preventDefault();
    setDone(false);
    if (name.length < 2 || !EMAIL_RE.test(email)) {
      setTried(true);
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      if (emailChanged) {
        // Email mới: gửi mã trước; họ tên lưu cùng lúc khi xác minh xong
        setSent(await api.post('/staff/account/email', { email }));
      } else {
        await saveName();
        setTried(false);
        setDone(true);
      }
    } catch (err) {
      setServerError(err);
    } finally {
      setPending(false);
    }
  };

  const onVerified = async (updated) => {
    setSent(null);
    setUser(updated);
    try {
      const latest = (await saveName()) || updated;
      setForm({ name: latest.fullName, email: latest.email || '' });
      setTried(false);
      setDone(true);
    } catch (err) {
      setServerError(err);
    }
  };

  return (
    <>
      <form className="t-panel" onSubmit={submit} noValidate aria-labelledby="tk-title">
        <h2 id="tk-title" className="t-h2">
          Thông tin cá nhân
        </h2>
        {done && <Notice>Đã lưu thay đổi thông tin tài khoản.</Notice>}
        <div className="t-field">
          <label htmlFor="tk-ten" className="t-label">
            Họ và tên <span className="t-req">*</span>
          </label>
          <input
            id="tk-ten"
            className="t-input t-input-tall"
            type="text"
            autoComplete="off"
            value={form.name}
            onChange={set('name')}
            aria-invalid={nameError ? 'true' : 'false'}
            aria-describedby={nameError ? 'tk-ten-loi' : undefined}
          />
          <FieldError id="tk-ten-loi">{nameError}</FieldError>
        </div>
        <div className="t-row">
          <ReadOnly id="tk-sdt" label="Số điện thoại">
            {user.phone ? `+84 ${user.phone.replace(/^0/, '')}` : '—'}
          </ReadOnly>
          <div className="t-field">
            <label htmlFor="tk-email" className="t-label">
              Email <span className="t-req">*</span>
            </label>
            <input
              id="tk-email"
              className="t-input t-input-tall"
              type="email"
              autoComplete="off"
              placeholder="ten@email.com"
              value={form.email}
              onChange={set('email')}
              aria-invalid={emailError ? 'true' : 'false'}
              aria-describedby={emailError ? 'tk-email-loi' : undefined}
            />
            <FieldError id="tk-email-loi">{emailError}</FieldError>
          </div>
        </div>
        <div className="t-row">
          <ReadOnly id="tk-vt" label="Vai trò tài khoản">
            {ROLE_LABELS[user.role]}
          </ReadOnly>
          <ReadOnly id="tk-nt" label="Ngày tạo">
            {fmtDate(user.createdAt)}
          </ReadOnly>
        </div>
        {serverError && !serverError.fields?.fullName && !serverError.fields?.email && <FieldError id="tk-loi">{serverError.message}</FieldError>}
        <div>
          <button type="submit" className="t-btn t-btn-primary t-btn-lg" disabled={pending} aria-busy={pending || undefined}>
            Lưu thông tin
          </button>
        </div>
      </form>
      {/* Ngoài <form>: sự kiện submit của React vẫn lan qua portal */}
      {sent && <EmailOtpDialog sent={sent} onResent={setSent} onVerified={onVerified} onClose={() => setSent(null)} />}
    </>
  );
}

/** Đổi mật khẩu: kiểm tra tại chỗ (tối thiểu 8 ký tự…) rồi gửi lên server. */
function PasswordForm({ user, setUser }) {
  const [form, setForm] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  // Tăng sau mỗi lần đổi xong để các ô mật khẩu về lại trạng thái ẩn
  const [round, setRound] = useState(0);

  // Lỗi kiểm tra tại chỗ chỉ hiện sau lần bấm đầu; lỗi server (vd. sai mật khẩu hiện tại) hiện tới khi sửa ô đó
  const fe = { ...(tried ? passwordErrors(form) : {}), ...(serverError?.fields || {}) };
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDone(false);
    setServerError((e) => (e?.fields?.[k] ? null : e));
  };

  const submit = async (e) => {
    e.preventDefault();
    setDone(false);
    if (Object.keys(passwordErrors(form)).length) {
      setTried(true);
      return;
    }
    setPending(true);
    setServerError(null);
    try {
      const res = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setUser(res.user);
      setForm(EMPTY);
      setTried(false);
      setDone(true);
      setRound((r) => r + 1);
    } catch (err) {
      setServerError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="t-panel" onSubmit={submit} noValidate aria-labelledby="mk-title">
      <AccountNameHint value={user.email || user.phone} />
      <h2 id="mk-title" className="t-h2">
        Đổi mật khẩu
      </h2>
      {done && <Notice>Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.</Notice>}
      <PasswordField key={`mk-cu-${round}`} id="mk-cu" label="Mật khẩu hiện tại" value={form.currentPassword} onChange={set('currentPassword')} error={fe.currentPassword} />
      <PasswordField key={`mk-moi-${round}`} id="mk-moi" label="Mật khẩu mới" value={form.newPassword} onChange={set('newPassword')} error={fe.newPassword} />
      <PasswordField key={`mk-nhap-${round}`} id="mk-nhap" label="Nhập lại mật khẩu mới" value={form.confirm} onChange={set('confirm')} error={fe.confirm} />
      {serverError && !Object.keys(serverError.fields || {}).length && <FieldError id="mk-loi">{serverError.message}</FieldError>}
      <div>
        <button type="submit" className="t-btn t-btn-primary t-btn-lg" disabled={pending} aria-busy={pending || undefined}>
          Đổi mật khẩu
        </button>
      </div>
    </form>
  );
}

/** Thông tin tài khoản của Admin và tiếp tân: sửa họ tên, đổi mật khẩu (theo prototype "TiepTan-TaiKhoan", "Admin-TaiKhoan"). */
export default function AccountInfo() {
  useDocumentTitle('Thông tin tài khoản');
  const { user, setUser } = useSession();
  return (
    <>
      <div>
        <h1 className="t-h1" style={{ marginBottom: 8 }}>
          Thông tin tài khoản
        </h1>
        <p className="t-lead">Xem và cập nhật thông tin của bạn. Đổi email cần xác minh bằng mã gửi tới email mới.</p>
      </div>
      <InfoForm user={user} setUser={setUser} />
      <PasswordForm user={user} setUser={setUser} />
    </>
  );
}
