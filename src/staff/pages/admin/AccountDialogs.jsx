import { useId, useState } from 'react';
import { ErrorAlert } from '../../../shared/ui/ui.jsx';
import { api } from '../../../shared/lib/api.js';
import { ROLE_LABELS } from '../../../shared/lib/format.js';
import { FieldError, normalizePhone, phoneError, PhoneField } from '../../components/fields.jsx';
import { PlainDialog } from '../../components/dialogs.jsx';
import { ROLE_ORDER, STAFF } from './Accounts.jsx';

// Hộp thoại tạo / sửa tài khoản nội bộ và đổi vai trò, cấp mật khẩu tạm

/** Thêm hoặc sửa tài khoản (UC.8.1, UC.8.2). */
export function AccountDialog({ account, onClose, onSaved }) {
  const titleId = useId();
  const isAdd = !account;
  const [form, setForm] = useState({
    fullName: account?.fullName || '',
    phone: String(account?.phone || '').replace(/^0/, ''),
    role: 'USER',
    tempPassword: '',
  });
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const needsPassword = isAdd && STAFF.includes(form.role);
  const errs = {
    fullName: form.fullName.trim() ? null : 'Vui lòng nhập họ và tên.',
    phone: phoneError(form.phone),
    tempPassword: !needsPassword || form.tempPassword.length >= 8 ? null : form.tempPassword ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.',
  };
  const fe = { ...(tried ? errs : {}), ...(error?.fields || {}) };

  const submit = async () => {
    setTried(true);
    setError(null);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    try {
      const body = { fullName: form.fullName.trim(), phone: normalizePhone(form.phone) };
      const res = isAdd
        ? await api.post('/admin/accounts', { ...body, role: form.role, tempPassword: needsPassword ? form.tempPassword : undefined })
        : await api.patch(`/admin/accounts/${account.id}`, body);
      onSaved(res.account, isAdd);
    } catch (err) {
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
        <p className="t-text">{isAdd ? 'Điền thông tin của người dùng mới.' : 'Chỉ sửa họ tên và số điện thoại. Muốn đổi vai trò, chọn ở cột Vai trò trong danh sách.'}</p>
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
      {isAdd && (
        <>
          <div className="t-field">
            <label htmlFor="tk-f-vaitro" className="t-label">
              Vai trò
            </label>
            <select id="tk-f-vaitro" className="t-select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
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
      {error && !error.fields && <ErrorAlert error={error} />}
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

/** Lên vai trò nội bộ mà tài khoản chưa có mật khẩu thì phải đặt mật khẩu tạm (BR.32). */
export function RolePasswordDialog({ account, role, onClose, onDone }) {
  const titleId = useId();
  const [pw, setPw] = useState('');
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const err = pw.length >= 8 ? null : pw ? 'Mật khẩu tạm cần ít nhất 8 ký tự.' : 'Vui lòng nhập mật khẩu tạm.';
  const submit = async () => {
    setTried(true);
    if (err) return;
    setPending(true);
    try {
      const res = await api.put(`/admin/accounts/${account.id}/role`, { role, tempPassword: pw });
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
          Đặt mật khẩu tạm
        </h2>
        <p className="t-text">
          Tài khoản <strong className="t-strong">{account.fullName}</strong> chưa có mật khẩu. Vai trò {ROLE_LABELS[role]} đăng nhập khu nội bộ bằng mật khẩu, nên cần đặt mật khẩu
          tạm trước khi đổi.
        </p>
      </div>
      <div className="t-field">
        <label htmlFor="vt-mk" className="t-label">
          Mật khẩu tạm <span className="t-req">*</span>
        </label>
        <input id="vt-mk" className="t-input" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={tried && err ? 'true' : 'false'} />
        <p className="t-muted">Ít nhất 8 ký tự. Người dùng phải đổi mật khẩu sau lần đăng nhập đầu.</p>
        <FieldError>{tried ? err : null}</FieldError>
      </div>
      <ErrorAlert error={error} />
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
