import { useId, useState } from 'react';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { ROLE_LABELS } from '../../../shared/lib/format.js';
import { FieldError, normalizePhone, phoneError, PhoneField, TPicker } from '../../components/fields.jsx';
import { PlainDialog } from '../../components/dialogs.jsx';
import { ROLE_ORDER, STAFF } from './Accounts.jsx';

// Hộp thoại tạo / sửa tài khoản nội bộ và đổi vai trò, cấp mật khẩu tạm

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Tài khoản nội bộ bắt buộc có email để dùng Quên mật khẩu. */
const emailError = (email) => (EMAIL_RE.test(email.trim()) ? null : email.trim() ? 'Email chưa đúng, ví dụ ten@email.com.' : 'Vui lòng nhập email.');

function EmailField({ id, value, onChange, error }) {
  return (
    <div className="t-field">
      <label htmlFor={id} className="t-label">
        Email <span className="t-req">*</span>
      </label>
      <input
        id={id}
        className="t-input"
        type="email"
        autoComplete="off"
        placeholder="ten@email.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={`${id}-ghichu ${id}-loi`}
      />
      <p id={`${id}-ghichu`} className="t-muted">
        Mã xác nhận của chức năng Quên mật khẩu gửi tới email này. Kiểm tra kỹ trước khi lưu.
      </p>
      <FieldError id={`${id}-loi`}>{error}</FieldError>
    </div>
  );
}

/** Thêm hoặc sửa tài khoản (UC.8.1, UC.8.2). */
export function AccountDialog({ account, self, onClose, onSaved }) {
  const titleId = useId();
  const isAdd = !account;
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    phone: String(account?.phone || '').replace(/^0/, ''),
    email: account?.email || '',
    role: 'USER',
    tempPassword: '',
  });
  const [version, setVersion] = useState(account?.infoUpdatedAt);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const needsPassword = isAdd && STAFF.includes(form.role);
  // Email của chính mình đổi ở trang Tài khoản, có xác minh bằng mã
  const needsEmail = isAdd ? needsPassword : STAFF.includes(account.role) && !self;
  const errs = {
    fullName: form.fullName.trim() ? null : 'Vui lòng nhập họ và tên.',
    phone: phoneError(form.phone),
    email: needsEmail ? emailError(form.email) : null,
    tempPassword: !needsPassword || form.tempPassword.length >= 8 ? null : form.tempPassword ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.',
  };
  const fe = { ...(tried ? errs : {}), ...(error?.fields || {}) };

  const submit = async () => {
    setTried(true);
    setError(null);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    try {
      const body = { fullName: form.fullName.trim(), phone: normalizePhone(form.phone), ...(needsEmail ? { email: form.email.trim().toLowerCase() } : {}) };
      const res = isAdd
        ? await api.post('/admin/accounts', { ...body, role: form.role, tempPassword: needsPassword ? form.tempPassword : undefined })
        : await api.patch(`/admin/accounts/${account.id}`, { ...body, expectedUpdatedAt: version });
      onSaved(res.account, isAdd);
    } catch (err) {
      // Vừa có người khác đổi thông tin: nạp lại để xem thông tin mới rồi mới lưu
      if (err.code === 'STALE') {
        const fresh = (await api.get(`/admin/accounts/${account.id}`)).account;
        setForm((f) => ({ ...f, fullName: fresh.fullName, phone: String(fresh.phone).replace(/^0/, ''), email: fresh.email || '' }));
        setVersion(fresh.infoUpdatedAt);
        setTried(false);
      }
      setError(err);
      setPending(false);
    }
  };

  return (
    <PlainDialog labelledBy={titleId} onClose={onClose} onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 id={titleId} className="t-h2">
          {isAdd ? 'Thêm tài khoản' : 'Sửa thông tin tài khoản'}
        </h2>
        <p className="t-text">{isAdd ? 'Điền thông tin của người dùng mới.' : `Chỉ sửa họ tên, số điện thoại${needsEmail ? ' và email' : ''}. Muốn đổi vai trò, chọn ở cột Vai trò trong danh sách.`}</p>
      </div>
      <div className="t-field">
        <label htmlFor="tk-f-ten" className="t-label">
          Họ và tên <span className="t-req">*</span>
        </label>
        <input
          id="tk-f-ten"
          className="t-input"
          autoComplete="off"
          value={form.fullName}
          onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          aria-invalid={fe.fullName ? 'true' : 'false'}
          aria-describedby="tk-f-ten-loi"
        />
        <FieldError id="tk-f-ten-loi">{fe.fullName}</FieldError>
      </div>
      <PhoneField id="tk-f-sdt" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={fe.phone} />
      {needsEmail && !isAdd && <EmailField id="tk-f-email" value={form.email} onChange={(email) => setForm((f) => ({ ...f, email }))} error={fe.email} />}
      {isAdd && (
        <>
          <div className="t-field">
            <label htmlFor="tk-f-vaitro" className="t-label">
              Vai trò
            </label>
            <TPicker
              id="tk-f-vaitro"
              value={form.role}
              onChange={(role) => setForm((f) => ({ ...f, role }))}
              items={ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            />
          </div>
          {needsEmail && <EmailField id="tk-f-email" value={form.email} onChange={(email) => setForm((f) => ({ ...f, email }))} error={fe.email} />}
          {needsPassword ? (
            <div className="t-field">
              <label htmlFor="tk-f-mk" className="t-label">
                Mật khẩu tạm <span className="t-req">*</span>
              </label>
              <input
                id="tk-f-mk"
                className="t-input"
                autoComplete="off"
                value={form.tempPassword}
                onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
                aria-invalid={fe.tempPassword ? 'true' : 'false'}
                aria-describedby="tk-f-mk-ghichu tk-f-mk-loi"
              />
              <p id="tk-f-mk-ghichu" className="t-muted">
                Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu.
              </p>
              <FieldError id="tk-f-mk-loi">{fe.tempPassword}</FieldError>
            </div>
          ) : (
            <p className="t-muted">Người dùng đăng nhập bằng số điện thoại và mã xác nhận gửi qua tin nhắn, không cần mật khẩu.</p>
          )}
        </>
      )}
      {error && !Object.keys(error.fields).length && <ErrorAlert error={error} />}
      <div className="a-modal-actions">
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
          Huỷ
        </button>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
          {isAdd ? 'Thêm tài khoản' : 'Lưu thay đổi'}
        </button>
      </div>
    </PlainDialog>
  );
}

/** Lên vai trò nội bộ mà tài khoản chưa có mật khẩu hoặc email thì phải bổ sung (BR.32). */
export function RolePasswordDialog({ account, role, needsPassword, onClose, onDone }) {
  const titleId = useId();
  const needsEmail = !account.email;
  const [pw, setPw] = useState('');
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const err = !needsPassword || pw.length >= 8 ? null : pw ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.';
  const mailErr = needsEmail ? emailError(email) : null;
  const submit = async () => {
    setTried(true);
    setError(null);
    if (err || mailErr) return;
    setPending(true);
    try {
      const res = await api.put(`/admin/accounts/${account.id}/role`, {
        role,
        ...(needsPassword ? { tempPassword: pw } : {}),
        ...(needsEmail ? { email: email.trim().toLowerCase() } : {}),
      });
      onDone(res.account);
    } catch (e) {
      setError(e);
      setPending(false);
    }
  };
  return (
    <PlainDialog labelledBy={titleId} onClose={onClose} onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 id={titleId} className="t-h2">
          Bổ sung thông tin đăng nhập
        </h2>
        <p className="t-text">
          Tài khoản <strong className="t-strong">{account.fullName}</strong> chưa có {[needsPassword && 'mật khẩu', needsEmail && 'email'].filter(Boolean).join(' và ')}. Vai trò{' '}
          {ROLE_LABELS[role]} đăng nhập khu nội bộ bằng mật khẩu và lấy lại mật khẩu qua email, nên cần bổ sung trước khi đổi.
        </p>
      </div>
      {needsEmail && <EmailField id="vt-email" value={email} onChange={setEmail} error={(tried ? mailErr : null) || error?.fields?.email} />}
      {needsPassword && (
        <div className="t-field">
          <label htmlFor="vt-mk" className="t-label">
            Mật khẩu tạm <span className="t-req">*</span>
          </label>
          <input id="vt-mk" className="t-input" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && err ? 'true' : 'false'} />
          <p className="t-muted">Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu.</p>
          <FieldError>{tried ? err : null}</FieldError>
        </div>
      )}
      {!error?.fields?.email && <ErrorAlert error={error} />}
      <div className="a-modal-actions">
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
          Huỷ
        </button>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
          Đổi vai trò
        </button>
      </div>
    </PlainDialog>
  );
}

/** Cấp mật khẩu tạm khi nhân viên không tự lấy lại được qua email (UC.8.5). */
export function ResetPasswordDialog({ account, onClose, onDone }) {
  const titleId = useId();
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const err = pw.length >= 8 ? null : pw ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.';
  const submit = async () => {
    setTried(true);
    setError(null);
    if (err) return;
    setPending(true);
    try {
      await api.post(`/admin/accounts/${account.id}/reset-password`, { tempPassword: pw });
      onDone();
    } catch (e) {
      setError(e);
      setPending(false);
    }
  };
  return (
    <PlainDialog labelledBy={titleId} onClose={onClose} onSubmit={submit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 id={titleId} className="t-h2">
          Đặt lại mật khẩu
        </h2>
        <p className="t-text">
          Cấp mật khẩu tạm cho <strong className="t-strong">{account.fullName}</strong>. Mật khẩu cũ hết tác dụng ngay. Người này phải đổi sang mật khẩu mới khi đăng nhập lại.
        </p>
      </div>
      <div className="t-field">
        <label htmlFor="dl-mk" className="t-label">
          Mật khẩu tạm <span className="t-req">*</span>
        </label>
        <input id="dl-mk" className="t-input" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && err ? 'true' : 'false'} />
        <p className="t-muted">Ít nhất 8 ký tự. Báo trực tiếp cho người dùng, đừng gửi qua kênh công khai.</p>
        <FieldError>{(tried ? err : null) || error?.fields?.tempPassword}</FieldError>
      </div>
      {!error?.fields?.tempPassword && <ErrorAlert error={error} />}
      <div className="a-modal-actions">
        <button type="button" className="t-btn t-btn-ghost" style={{ padding: '0 28px' }} onClick={onClose}>
          Huỷ
        </button>
        <button type="submit" className="t-btn t-btn-primary" style={{ padding: '0 28px' }} disabled={pending}>
          Đặt lại mật khẩu
        </button>
      </div>
    </PlainDialog>
  );
}
